import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { ingestRawRecord } from "@/lib/knowledge/ingest";

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function syncGithub(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const repoLimit = Math.min(
    Number(req.nextUrl.searchParams.get("repos") || "5"),
    20
  );

  const commitLimit = Math.min(
    Number(req.nextUrl.searchParams.get("commits") || "5"),
    20
  );

  const prLimit = Math.min(Number(req.nextUrl.searchParams.get("prs") || "5"), 20);

  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId,
      organizationId,
      provider: "GITHUB",
      accessToken: {
        not: null,
      },
      revokedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      source: true,
    },
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "GitHub is not connected for this user" },
      { status: 404 }
    );
  }

  const source =
    account.source ??
    (await prisma.source.upsert({
      where: {
        id: `github-${organizationId}-${userId}`,
      },
      update: {
        status: "CONNECTED",
      },
      create: {
        id: `github-${organizationId}-${userId}`,
        type: "GITHUB",
        name: "GitHub",
        status: "CONNECTED",
        organizationId,
      },
    }));

  const accessToken = decryptToken(account.accessToken);

  const reposRes = await fetch(
    `https://api.github.com/user/repos?per_page=${repoLimit}&sort=updated&affiliation=owner,collaborator,organization_member`,
    {
      headers: githubHeaders(accessToken),
    }
  );

  if (!reposRes.ok) {
    const errorText = await reposRes.text();

    return NextResponse.json(
      {
        error: "GitHub repos fetch failed",
        status: reposRes.status,
        details: errorText,
      },
      { status: 500 }
    );
  }

  const repos = await reposRes.json();

  if (!Array.isArray(repos)) {
    return NextResponse.json(
      {
        error: "GitHub repos response was not an array",
        details: repos,
      },
      { status: 500 }
    );
  }

  let recordsSynced = 0;
  let chunksCreated = 0;

  for (const repo of repos) {
    const repoContent = `
GitHub Repository: ${repo.full_name}
Name: ${repo.name}
Owner: ${repo.owner?.login}
Private: ${repo.private ? "Yes" : "No"}
Description: ${repo.description ?? "No description"}
Language: ${repo.language ?? "Unknown"}
Default Branch: ${repo.default_branch}
Stars: ${repo.stargazers_count}
Forks: ${repo.forks_count}
Open Issues: ${repo.open_issues_count}
Updated At: ${repo.updated_at}
URL: ${repo.html_url}
    `;

    const repoRecord = await ingestRawRecord({
      provider: "GITHUB",
      recordType: "repository",
      externalId: `repo:${repo.full_name}`,
      title: `GitHub Repo: ${repo.full_name}`,
      content: repoContent,
      payload: repo,
      sourceId: source.id,
      userId,
      organizationId,
      visibility: "PERSONAL",
    });

    recordsSynced += 1;
    chunksCreated += repoRecord.chunksCreated;

    const commitsRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/commits?per_page=${commitLimit}`,
      {
        headers: githubHeaders(accessToken),
      }
    );

    if (commitsRes.ok) {
      const commits = await commitsRes.json();

      if (Array.isArray(commits)) {
        for (const commit of commits) {
          const commitContent = `
GitHub Repository: ${repo.full_name}
Commit SHA: ${commit.sha}
Author: ${commit.commit?.author?.name ?? "Unknown"}
Author Email: ${commit.commit?.author?.email ?? "Unknown"}
Date: ${commit.commit?.author?.date ?? "Unknown"}
Message:
${commit.commit?.message ?? ""}
URL: ${commit.html_url}
          `;

          const commitRecord = await ingestRawRecord({
            provider: "GITHUB",
            recordType: "commit",
            externalId: `commit:${repo.full_name}:${commit.sha}`,
            title: `Commit: ${commit.commit?.message?.split("\n")[0] ?? commit.sha}`,
            content: commitContent,
            payload: commit,
            sourceId: source.id,
            userId,
            organizationId,
            visibility: "PERSONAL",
          });

          recordsSynced += 1;
          chunksCreated += commitRecord.chunksCreated;
        }
      }
    }

    const prsRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/pulls?state=all&per_page=${prLimit}`,
      {
        headers: githubHeaders(accessToken),
      }
    );

    if (prsRes.ok) {
      const pullRequests = await prsRes.json();

      if (Array.isArray(pullRequests)) {
        for (const pr of pullRequests) {
          const prContent = `
GitHub Repository: ${repo.full_name}
Pull Request: #${pr.number}
Title: ${pr.title}
State: ${pr.state}
Author: ${pr.user?.login ?? "Unknown"}
Created At: ${pr.created_at}
Updated At: ${pr.updated_at}
Merged At: ${pr.merged_at ?? "Not merged"}
Body:
${pr.body ?? ""}
URL: ${pr.html_url}
          `;

          const prRecord = await ingestRawRecord({
            provider: "GITHUB",
            recordType: "pull_request",
            externalId: `pr:${repo.full_name}:${pr.number}`,
            title: `PR #${pr.number}: ${pr.title}`,
            content: prContent,
            payload: pr,
            sourceId: source.id,
            userId,
            organizationId,
            visibility: "PERSONAL",
          });

          recordsSynced += 1;
          chunksCreated += prRecord.chunksCreated;
        }
      }
    }
  }

  await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      status: "CONNECTED",
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    provider: "GITHUB",
    sourceId: source.id,
    reposFetched: repos.length,
    recordsSynced,
    chunksCreated,
  });
}

export async function POST(req: NextRequest) {
  return syncGithub(req);
}

export async function GET(req: NextRequest) {
  return syncGithub(req);
}