export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[50vh] w-full">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--primary)] border-opacity-20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--primary)] rounded-full animate-spin border-t-transparent"></div>
            </div>
        </div>
    );
}
 