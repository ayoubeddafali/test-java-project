const core = require('@actions/core');
const github = require('@actions/github');
const dataForge = require('data-forge');
require('data-forge-fs');
// const {Buffer} = require('buffer');
import { Buffer  } from "buffer";
const fs = require('fs');
const unzip = require('unzipper');

async function run() {
  const myToken = core.getInput('github-token');

  const octokit = github.getOctokit(myToken)
  const context = github.context;

  try {
    const workflowRunArtifacts = await octokit.rest.actions.listWorkflowRunArtifacts(
      {owner: context.repo.owner, repo: context.repo.repo, run_id: context.runId}
    ); 
    console.log(workflowRunArtifacts)
    const artifact = workflowRunArtifacts.data.artifacts.find((el: { name: string; }) => el.name == "arvos-report");
    console.log(artifact)
    if (!artifact) {
      return null
    } 
    const response = await octokit.rest.actions.downloadArtifact({
      owner: context.repo.owner,
      repo: context.repo.repo,
      artifact_id: artifact.id,
      archive_format: "zip",
    })
    console.log(response)
    if (response.status == 200) {
      await fs.promises.writeFile('/tmp/arvos-report.zip', Buffer.from(response.data));
      const fsStream = fs.createReadStream('/tmp/arvos-report.zip')
      const unzipper = fsStream.pipe(unzip.Extract({ path: '/tmp/' }));
      await new Promise<void>((resolve, reject) => {
        const endOnError = (error: any) => reject(error);
        unzipper.on('close', () => resolve());
        fsStream.on('error', endOnError);
        unzipper.on('error', endOnError);
      });
    } else {
      console.log(`ERROR >> ${response.status}`);
    }
  
  } catch (e) { 
    console.error('Error getting workflow run artifacts', e)
  }

  console.log("Getting report data")
    const result = {
      "vulns_count": 0,
      "symbols_count": 0,
      "pieData": []
    };
    let data = dataForge.readFileSync('/tmp/arvos-report.csv').parseCSV().renameSeries(
      { "ID": "id",
        "Vulnerability": "vulnerability",
        "Vulnerability Detail": "detail",
        "Score": "score",
        "Description": "description",
        "Invoked Class": "class",
        "Invoked Method": "method",
        "Package name": "package",
        "Github Repository": "repo",
        "Package manager": "manager",
        "Version range": "range",
        "Stacktrace": "stacktrace"
      })
  
    result['vulns_count'] = data.getSeries('vulnerability').distinct().count();
    result['symbols_count'] = data.count()
  
    console.log(result)
    

}

run();