import { Resend } from 'resend';
import { WelcomeEmail } from '../components/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Megatron <welcome@megatron-beta.vercel.app>',
            to: [to],
            subject: 'Hey, Welcome to Megatron!',
            react: WelcomeEmail({ userEmail: to }),
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
