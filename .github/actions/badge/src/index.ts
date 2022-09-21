const core = require('@actions/core');
const github = require('@actions/github');
const dataForge = require('data-forge');
require('data-forge-fs');

async function run() {
  const myToken = core.getInput('github-token');
  const reportPath = core.getInput('report-path');

  // const context = github.context;

  const result = {
    "vulns_count": 0,
    "symbols_count": 0,
    "risks_count": Object()
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

  let scoreCount = Object()
  scoreCount['CRITICAL'] = 0
  scoreCount['HIGH'] = 0
  scoreCount['MEDIUM'] = 0
  scoreCount['LOW'] = 0

  let riskGroups = data.groupBy((row: { vulnerability: any; }) => row.vulnerability).select(
    (    group: { first: () => { (): any; new(): any; score: any; }; count: () => any; }) => {
      return {
        risk : group.first().score,
        symbolsCount: group.count()
      }
    }).groupBy((r: { risk: any; }) => r.risk ).select(
      (      group: { first: () => { (): any; new(): any; risk: any; }; count: () => any; }) => {
        return {
          risk: group.first().risk,
          count: group.count()
        }
      }
    ).inflate()

  riskGroups.forEach((element: { [x: string]: any; }) => {
      scoreCount[element['risk']] += element['count']
  });

  result['risks_count'] = scoreCount

  core.setOutput("vulnerabilities", result['vulns_count']);
  core.setOutput("symbols", result['symbols_count'])
  core.setOutput("critical-count", scoreCount['CRITICAL'])
  core.setOutput("high-count", scoreCount['HIGH'])
  core.setOutput("medium-count", scoreCount['MEDIUM'])
  core.setOutput("low-count", scoreCount['LOW'])

  console.log(result)
}

run();