import { db } from '@megatron/database';
import { DEFAULT_CONFIG } from '@megatron/lib-common';
import { runLlmCycleForAsset } from '../modules/llm-pipeline';
import { runPriceRecomputeForTest } from '../modules/price-engine';

jest.mock('@megatron/database', () => {
  const priceTicks: any[] = [];
  const oracleLogs: any[] = [];

  return {
    Prisma: {
      Decimal: class {
        constructor(val: any) { return val; }
      },
    },
    db: {
      __priceTicks: priceTicks,
      __oracleLogs: oracleLogs,
      asset: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      trade: {
        findMany: jest.fn(),
      },
      target: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      oracleLog: {
        create: jest.fn(async ({ data }: any) => {
          oracleLogs.push(data);
          return data;
        }),
        findFirst: jest.fn(),
      },
      priceTick: {
        create: jest.fn(async ({ data }: any) => {
          priceTicks.push(data);
          return data;
        }),
      },
      $transaction: jest.fn(async (ops: any[]) => {
        for (const op of ops) {
          await op;
        }
      }),
    },
  };
});

jest.mock('@megatron/lib-ai', () => ({
  LocalSentinel: {
    analyze: jest.fn(async () => ({
      delta_percent: 10,
      confidence: DEFAULT_CONFIG.LLM_CONFIDENCE_MIN + 0.1,
      summary: 'Bullish',
      reasoning: 'Test reasoning',
      source_urls: ['https://example.com'],
    })),
    init: jest.fn(),
  },
}));

jest.mock('@megatron/lib-integrations', () => ({
  querySerper: jest.fn(async () => [
    { title: 'Test', snippet: 'Snippet', link: 'https://example.com' },
  ]),
  publishEvent: jest.fn(async () => { }),
}));

jest.mock('../lib/redis', () => ({
  publishOracleEvent: jest.fn(async () => { }),
  CHANNELS: { EVENTS: 'megatron:events' },
}));

describe('Milestone 6: LLM Pipeline and Price Engine', () => {
  const mockedDb = db as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.__priceTicks.length = 0;
    mockedDb.__oracleLogs.length = 0;
  });

  test('LLM pipeline logs oracle signal and emits OracleEvent', async () => {
    const assetId = 'asset-1';

    mockedDb.asset.findUnique.mockResolvedValue({
      id: assetId,
      status: 'active',
      oracleQueries: ['test query'],
    });

    await runLlmCycleForAsset(assetId);

    expect(mockedDb.oracleLog.create).toHaveBeenCalledTimes(1);
    expect(mockedDb.__oracleLogs[0]).toMatchObject({
      assetId,
      summary: 'Bullish',
    });
  });

  test('Price engine recomputes prices and writes PriceTick', async () => {
    const assetId = 'asset-1';

    mockedDb.asset.findUnique.mockResolvedValue({
      id: assetId,
      pricingParams: { P0: 1, k: 0.01 },
      totalSupply: { toNumber: () => 100 },
      lastFundamental: { toNumber: () => 1 },
    });

    mockedDb.trade.findMany.mockResolvedValue([
      {
        price: { toNumber: () => 1 },
        quantity: { toNumber: () => 10 },
      },
    ]);

    await runPriceRecomputeForTest(assetId, { deltaPercent: 5 });

    expect(mockedDb.priceTick.create).toHaveBeenCalledTimes(1);
    const tick = mockedDb.__priceTicks[0];
    expect(tick.assetId).toBe(assetId);
    expect(tick.priceDisplay).toBeGreaterThan(0);
    expect(tick.priceFundamental).toBeGreaterThan(0);
  });
});
