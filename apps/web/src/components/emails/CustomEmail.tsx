import * as React from 'react';

interface CustomEmailProps {
    userEmail: string;
    content: string;
}

export const CustomEmail: React.FC<CustomEmailProps> = ({ userEmail, content }) => {
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
            <p>Hey {userName},</p>
            <div style={{ whiteSpace: 'pre-wrap' }}>
                {content}
            </div>
            <p style={{ marginTop: '30px' }}>Let's get after it,</p>
            <p><strong>The Megatron Crew</strong></p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                <a href="https://megatron-beta.vercel.app" style={{ color: '#888', textDecoration: 'none' }}>megatron-beta.vercel.app</a>
            </p>
        </div>
    );
};
