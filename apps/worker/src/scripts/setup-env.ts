
import { config } from 'dotenv';
import path from 'path';

// Force load env from root
// Assumes running from project root or checks relative path
config({ path: path.resolve(__dirname, '../../../../.env') });
