const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  const myToken = core.getInput('github-token');

  const octokit = github.getOctokit(myToken)
  const context = github.context;

  try {
    const workflowRunArtifacts = await octokit.actions.listWorkflowRunArtifacts(
      {owner: context.repo.owner, repo: context.repo.repo, run_id: context.runId}
    ); 
    const artifact = workflowRunArtifacts.data.artifacts.find(el => el.name == "arvos-report");
    if (!artifact) {
      return null
    } 
    const response = await octokit.actions.downloadArtifact({
      owner: context.repo.owner,
      repo: context.repo.repo,
      artifact_id: artifact.id,
      archive_format: "zip",
    })
    if (response.status == 200) {
      await fs.promises.writeFile('/tmp/arvos-report.zip', Buffer.from(response.data));
      const fsStream = fs.createReadStream('/tmp/arvos-report.zip')
      const unzipper = fsStream.pipe(unzip.Extract({ path: '/tmp/' }));
      await new Promise((resolve, reject) => {
        const endOnError = (error) => reject(error);
        unzipper.on('close', () => resolve());
        fsStream.on('error', endOnError);
        unzipper.on('error', endOnError);
      });

    } else {
        console.log(`ERROR >> ${res.status}`);
    }
  
  } catch (e) { 
    console.error('Error getting workflow run artifacts', e)
    return [];
  }

}

run();