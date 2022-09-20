const core = require('@actions/core');
const github = require('@actions/github');
const dataForge = require('data-forge');
require('data-forge-fs');

async function run() {
  const myToken = core.getInput('github-token');
  const reportPath = core.getInput('report-path');

  const octokit = github.getOctokit(myToken)
  const context = github.context;

  console.log("Getting report data")

  const result = {
    "vulns_count": 0,
    "symbols_count": 0,
    "pieData": []
  };
  let data = dataForge.readFileSync(reportPath).parseCSV().renameSeries(
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