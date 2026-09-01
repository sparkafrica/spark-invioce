function hasMessage(e: unknown): e is { message: string } {
	return (
		typeof e === 'object' &&
		e !== null &&
		'message' in e &&
		typeof e.message === 'string' &&
		e.message.length > 0
	);
}

export function getErrorMessage(
	e: unknown,
	fallback = 'Something went wrong',
): string {
	return hasMessage(e) ? e.message : fallback;
}

export function isErrorWithCode(
	e: unknown,
): e is { code?: string; message?: string } {
	return typeof e === 'object' && e !== null && ('code' in e || 'message' in e);
}
