import React from 'react';
import { Resend } from 'resend';
import { WelcomeEmail } from '../components/emails/WelcomeEmail';
import { CustomEmail } from '../components/emails/CustomEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Megatron <onboarding@resend.dev>',
            replyTo: 'khoualdiyassin26@gmail.com',
            to: [to],
            subject: 'Hey, Welcome to Megatron!',
            react: React.createElement(WelcomeEmail, { userEmail: to }),
        });

        if (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Unexpected error sending welcome email:', error);
        return { success: false, error };
    }
}

export async function broadcastCustomEmail(users: { email: string }[], subject: string, content: string) {
    try {
        const batchRequests = users.map(user => ({
            from: 'Megatron <onboarding@resend.dev>',
            replyTo: 'khoualdiyassin26@gmail.com',
            to: [user.email],
            subject: subject,
            react: React.createElement(CustomEmail, { userEmail: user.email, content }),
        }));

        // Resend batch limit is 100 per request
        const batches = [];
        for (let i = 0; i < batchRequests.length; i += 100) {
            batches.push(batchRequests.slice(i, i + 100));
        }

        const results = await Promise.all(batches.map(batch => resend.batch.send(batch)));

        // Check for errors in any batch
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            console.error('Errors in broadcast batches:', errors);
            return { success: false, errors };
        }

        return { success: true, results };
    } catch (error) {
        console.error('Error broadcasting custom email:', error);
        return { success: false, error };
    }
}
