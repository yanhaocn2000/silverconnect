import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/components/domain/sessionCookie";

/**
 * POST-only sign-out endpoint.
 *
 * Route handlers (unlike page renderers) can mutate cookies, so we
 * delete the session cookie here, then 302 to /home for the same
 * locale. POST-only by design: a GET logout is a CSRF vector (an
 * <img>/prefetch could silently sign the user out), so callers must
 * use <form action="/auth/logout" method="post"> or fetch POST —
 * never a plain <a href>.
 */
async function handle(req: Request, params: { locale: string }) {
  const { locale } = params;
  const url = new URL(req.url);
  const target = new URL(`/${locale}/home`, url.origin);
  const res = NextResponse.redirect(target, { status: 302 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ locale: string }> }
) {
  return handle(req, await ctx.params);
}
