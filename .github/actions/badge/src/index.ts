const core = require('@actions/core');
const github = require('@actions/github');
const dataForge = require('data-forge');
require('data-forge-fs');
// const {Buffer} = require('buffer');
import { Buffer  } from "buffer";
const fs = require('fs');
const unzip = require('unzipper');

function getReportData() {
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

  // const sumObjectsByKey = (...objs: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; }[]) => {
  //   const res = objs.reduce((a, b) => {
  //       for (let k in b) {
  //         if (b.hasOwnProperty(k))
  //         a[k] = (a[k] || 0) + b[k];
  //       }
  //       return a;
  //   }, {});
  //   return res;
  // }

  let scoreCountInit = {'CRITICAL':0, 'HIGH': 0, 'MEDIUM': 0, 'LOW':0}
  let uniqVulns = data.distinct((vuln: { vulnerability: any; }) => vuln.vulnerability)
  let arr = uniqVulns.getSeries('score').toArray()
  var scoreCount = arr.reduce((acc: { [x: string]: number; }, val: string | number) => {
    acc[val] = acc[val] === undefined ? 1 : acc[val] += 1;
    return acc;
  }, {});
  
  // let scores = sumObjectsByKey(scoreCountInit, scoreCount )
  // result.pieData = [scores['CRITICAL'], scores['HIGH'], scores['MEDIUM'], scores['LOW']]

  return result;
}

async function donwloadArvosReport(octokit: { rest: { actions: { listWorkflowRunArtifacts: (arg0: { owner: any; repo: any; run_id: any; }) => any; downloadArtifact: (arg0: { owner: any; repo: any; artifact_id: any; archive_format: string; }) => any; }; }; }, context: { repo: { owner: any; repo: any; }; runId: any; }) {

  try {
    const workflowRunArtifacts = await octokit.rest.actions.listWorkflowRunArtifacts(
      {owner: context.repo.owner, repo: context.repo.repo, run_id: context.runId}
    ); 
    const artifact = workflowRunArtifacts.data.artifacts.find((el: { name: string; }) => el.name == "arvos-report");
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
    return workflowRunArtifacts
  
  } catch (e) { 
    console.error('Error getting workflow run artifacts', e)
    return [];
  }
}

async function run() {
  const myToken = core.getInput('github-token');

  const octokit = github.getOctokit(myToken)
  const context = github.context;

  const t = await donwloadArvosReport(octokit, context)
  console.log(t)
  console.log("Getting report data")
  const data = getReportData()
  console.log(data)
    

}

run();