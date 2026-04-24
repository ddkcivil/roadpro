export function withErrorHandler(handler) {
    return async (req, res) => {
        try {
            await handler(req, res);
        }
        catch (error) {
            console.error('Unhandled API error:', error);
            // Attempt to send a JSON error response if one hasn't been sent already
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    details: error.message || 'An unexpected error occurred.',
                    type: error.name,
                    code: error.code,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                });
            }
        }
    };
}
