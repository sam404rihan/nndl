export default function LabOSIcon({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Simple beaker/flask icon */}
            <path
                d="M9 3V9L5 17C4.5 18 4.5 19 5 20C5.5 21 6.5 21 7 21H17C17.5 21 18.5 21 19 20C19.5 19 19.5 18 19 17L15 9V3M9 3H15M9 3H8M15 3H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9 9H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}
