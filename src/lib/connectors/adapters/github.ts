import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { ingestRawRecord } from "@/lib/knowledge/ingest";
import { ConnectorAdapter, ConnectorSyncContext } from "@/lib/connectors/types";

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export const githubAdapter: ConnectorAdapter = {
  type: "GITHUB",
  label: "GitHub",
  supportsAutoSync: true,

  async sync({ sourceId, userId, organizationId }: ConnectorSyncContext) {
    const account = await prisma.connectedAccount.findFirst({
      where: {
        userId,
        organizationId,
        provider: "GITHUB",
        accessToken: { not: null },
        revokedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!account?.accessToken) {
      throw new Error("GitHub account is not connected.");
    }

    const accessToken = decryptToken(account.accessToken);

    const reposLimit = Number(process.env.GITHUB_SYNC_REPOS_LIMIT || "100");
    const commitsLimit = Number(process.env.GITHUB_SYNC_COMMITS_LIMIT || "10");
    const prsLimit = Number(process.env.GITHUB_SYNC_PRS_LIMIT || "10");

    const reposRes = await fetch(
      `https://api.github.com/user/repos?per_page=${reposLimit}&sort=updated&affiliation=owner,collaborator,organization_member`,
      { headers: githubHeaders(accessToken) }
    );

    if (!reposRes.ok) {
      throw new Error(`GitHub repos fetch failed: ${reposRes.status} ${await reposRes.text()}`);
    }

    const repos = await reposRes.json();

    if (!Array.isArray(repos)) {
      throw new Error("GitHub repos response was not an array.");
    }

    let recordsSynced = 0;
    let chunksCreated = 0;

    for (const repo of repos) {
      const repoRecord = await ingestRawRecord({
        provider: "GITHUB",
        recordType: "repository",
        externalId: `repo:${repo.full_name}`,
        title: `GitHub Repo: ${repo.full_name}`,
        content: `
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
        `,
        payload: repo,
        sourceId,
        userId,
        organizationId,
        visibility: "PERSONAL",
      });

      recordsSynced += 1;
      chunksCreated += repoRecord.chunksCreated;

      const commitsRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/commits?per_page=${commitsLimit}`,
        { headers: githubHeaders(accessToken) }
      );

      if (commitsRes.ok) {
        const commits = await commitsRes.json();

        if (Array.isArray(commits)) {
          for (const commit of commits) {
            const commitRecord = await ingestRawRecord({
              provider: "GITHUB",
              recordType: "commit",
              externalId: `commit:${repo.full_name}:${commit.sha}`,
              title: `Commit: ${commit.commit?.message?.split("\n")[0] ?? commit.sha}`,
              content: `
GitHub Repository: ${repo.full_name}
Commit SHA: ${commit.sha}
Author: ${commit.commit?.author?.name ?? "Unknown"}
Date: ${commit.commit?.author?.date ?? "Unknown"}
Message:
${commit.commit?.message ?? ""}
URL: ${commit.html_url}
              `,
              payload: commit,
              sourceId,
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
        `https://api.github.com/repos/${repo.full_name}/pulls?state=all&per_page=${prsLimit}`,
        { headers: githubHeaders(accessToken) }
      );

      if (prsRes.ok) {
        const prs = await prsRes.json();

        if (Array.isArray(prs)) {
          for (const pr of prs) {
            const prRecord = await ingestRawRecord({
              provider: "GITHUB",
              recordType: "pull_request",
              externalId: `pr:${repo.full_name}:${pr.number}`,
              title: `PR #${pr.number}: ${pr.title}`,
              content: `
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
              `,
              payload: pr,
              sourceId,
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

    return {
      provider: "GITHUB",
      recordsSynced,
      chunksCreated,
      details: {
        reposFetched: repos.length,
      },
    };
  },
};