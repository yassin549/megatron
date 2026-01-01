export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            <div className="text-center space-y-8">
                {/* Logo */}
                <div className="flex justify-center mb-2 overflow-visible">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 animate-pulse">
                        <img
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            className="w-full h-full object-contain mix-blend-screen filter brightness-110 contrast-125"
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="h-20 flex items-center justify-center">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">
                        MEGATRON
                    </h1>
                </div>

                {/* Progress Bar Container (Mockup for Transition) */}
                <div className="w-64 h-1 bg-gray-900 rounded-full mx-auto overflow-hidden mt-8">
                    <div className="h-full bg-white w-1/2 animate-[shimmer_2s_infinite]" />
                </div>
            </div>
        </div>
    );
}
