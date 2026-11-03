export interface SuccessResponse<T> {
  success: true;
  response: T;
}

export function successResponse<T>({
  response,
}: {
  response: T;
}): SuccessResponse<T> {
  return { success: true, response };
}
