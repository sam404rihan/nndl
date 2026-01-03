import Link from 'next/link';
import LabOSIcon from '@/components/LabOSIcon';

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col">

            {/* Header */}
            <header
                className="border-b"
                style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)'
                }}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LabOSIcon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                            <div>
                                <h1 className="text-xl font-semibold" style={{ letterSpacing: '-0.01em' }}>LabOS</h1>
                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: '4px', letterSpacing: '0.01em' }}>
                                    Laboratory Management System
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center">
                <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
                    <div className="max-w-3xl">

                        <h2
                            className="text-4xl lg:text-5xl font-semibold mb-5"
                            style={{
                                letterSpacing: '-0.025em',
                                lineHeight: '1.1',
                                fontWeight: 'var(--font-weight-semibold)'
                            }}
                        >
                            Laboratory Management System
                        </h2>

                        <p
                            className="mb-3"
                            style={{
                                color: 'var(--color-text-primary)',
                                fontSize: 'var(--font-size-base)',
                                lineHeight: '1.6',
                                fontWeight: 'var(--font-weight-medium)',
                                letterSpacing: '-0.01em'
                            }}
                        >
                            Secure laboratory information system with role-based access control and comprehensive audit logging.
                        </p>

                        <p
                            className="mb-8"
                            style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: 'var(--font-size-base)',
                                lineHeight: '1.6',
                                fontWeight: 'var(--font-weight-normal)',
                                letterSpacing: '-0.01em'
                            }}
                        >
                            Immutable report generation after approval. Designed for clinical laboratory operations and regulatory compliance.
                        </p>

                        {/* Authentication Section */}
                        <div
                            className="border-t pt-8"
                            style={{ borderColor: 'var(--color-border)', borderTopWidth: '2px' }}
                        >
                            <p
                                className="mb-5"
                                style={{
                                    color: 'var(--color-text-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em'
                                }}
                            >
                                Staff Authentication Required
                            </p>

                            <Link
                                href="/login"
                                className="inline-flex items-center px-8 py-4 font-medium"
                                style={{
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)',
                                    textDecoration: 'none',
                                    fontSize: 'var(--font-size-base)',
                                    letterSpacing: '-0.01em',
                                    border: '2px solid var(--color-primary)',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                Authenticate & Enter
                            </Link>

                            <p
                                className="mt-4"
                                style={{
                                    color: '#B91C1C',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    letterSpacing: '0.01em'
                                }}
                            >
                                Laboratory personnel only. Credentials required.
                            </p>
                        </div>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer
                className="border-t"
                style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface)'
                }}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }} suppressHydrationWarning>
                        © {new Date().getFullYear()} LabOS Diagnostics. HIPAA Compliant System.
                    </p>
                </div>
            </footer>

        </div>
    );
}
