import * as React from 'react';

interface WelcomeEmailProps {
    userEmail: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ userEmail }) => {
    const userName = userEmail.split('@')[0];

    return (
        <div style={{
            fontFamily: 'sans-serif',
            color: '#333',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#ffffff'
        }}>
            <h1 style={{ color: '#000', marginBottom: '20px' }}>Hey, Welcome to Megatron!</h1>
            <p>Hey {userName},</p>
            <p>
                Stoked you're joining us at Megatron! Think of us as the spot where everyday stuff like AI buzz
                or startup vibes turns into things you can actually trade and make money on –
                kinda like stocks, but for real-world trends.
            </p>
            <p>
                Got your eye on something like the AI Hype Index to bet on what's blowing up next,
                or the Venture Capital Activity Index to follow hot new companies?
                Our synthetic assets let you jump in and ride those waves. Best part?
                It's all free to start – no hidden fees, just dive right in.
            </p>
            <p>A few quick pointers to get you going:</p>
            <ul>
                <li>Peek at the assets still in funding and toss in some liquidity if you like.</li>
                <li>When they're live, buy or sell based on your thoughts about the asset – is the hype gonna explode or fizzle out?</li>
                <li>Keep an eye out for new ones dropping; we're always cooking up fresh ideas to trade.</li>
            </ul>
            <p>
                Got questions or some wild ideas for new indexes? Just reply – we're listening.
            </p>
            <p>Let's get after it,</p>
            <p><strong>The Megatron Crew</strong></p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                <a href="https://megatron-beta.vercel.app" style={{ color: '#888', textDecoration: 'none' }}>megatron-beta.vercel.app</a>
            </p>
        </div>
    );
};
