import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
      provider: "GITHUB",
      accessToken: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "GitHub is not connected for this user" },
      { status: 404 }
    );
  }

  const accessToken = decryptToken(account.accessToken);

  const profileRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const reposRes = await fetch(
    "https://api.github.com/user/repos?per_page=20&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const profile = await profileRes.json();
  const repos = await reposRes.json();

  return NextResponse.json({
    connectedAccount: {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      providerEmail: account.providerEmail,
      scope: account.scope,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    },
    profile: {
      id: profile.id,
      login: profile.login,
      name: profile.name,
      email: profile.email,
      company: profile.company,
    },
    repos: Array.isArray(repos)
      ? repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          owner: repo.owner?.login,
          htmlUrl: repo.html_url,
          updatedAt: repo.updated_at,
          permissions: repo.permissions,
        }))
      : repos,
  });
}