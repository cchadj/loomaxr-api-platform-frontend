import { cookies } from "next/headers";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await context.params;
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("frontend_access_token")?.value;
  const devMode = cookieStore.get("frontend_dev_mode")?.value === "true";
  const devUserId = cookieStore.get("frontend_dev_user_id")?.value;
  const devRoles = cookieStore.get("frontend_dev_roles")?.value;

  const headers = new Headers();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else if (devMode && devUserId && devRoles) {
    headers.set("X-User-Id", devUserId);
    headers.set("X-User-Roles", devRoles);
  } else {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const backendRes = await fetch(`${BACKEND_BASE_URL}/api/assets/${assetId}/download`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const contentType = backendRes.headers.get("content-type");
  const contentDisposition = backendRes.headers.get("content-disposition");
  const contentLength = backendRes.headers.get("content-length");

  if (contentType) responseHeaders.set("Content-Type", contentType);
  if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}
