import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            isAdmin: boolean;
        };
    }

    interface User {
        id: string;
        email: string;
        isAdmin?: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        isAdmin: boolean;
    }
}
