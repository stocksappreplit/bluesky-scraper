import login from "./utils/login.js";
import { AsyncParser } from "@json2csv/node";
import fs from "fs/promises";
import date from "date-and-time";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cheerio from "cheerio"
dotenv.config();

const envVars = [
  "USER_NAME",
  "PASSWORD",
  "GMAIL_ID",
  "GMAIL_PASS",
  "RECIVER_EMAIL",
];

for (const item of envVars) {
  if (!process.env[item]) {
    throw new Error(`Environment variable '${item}' is missing.`);
  }
}

const logedIn = await login();
console.log("logedIn");

const apiRes = await fetch(
  "https://bssservice.blueskymss.com/mvc/api/ui/grid/list",
  {
    headers: {
      accept: "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,bn;q=0.7",
      "access-control-allow-headers": "Origin, Content-Type, X-Auth-Token",
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": "*",
      authorization: "Bearer " + logedIn.access_token,
      "content-type": "application/json;charset=UTF-8",
      "sec-ch-ua":
        '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    referrer: "https://whiteglove.blueskymss.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: '[{"key":"value","value":"160281"},{"key":"filterId","value":"73179b44-6cc5-4fd2-8695-75c4029530a5"},{"key":"_tcp","value":"whiteglove"},{"key":"gridType","value":1},{"key":"filter","value":"true"},{"key":"f0","value":"DateTimeType = 1"},{"key":"f1","value":"DateTimeTypeText = \'Future And Last Week\'"},{"key":"f2","value":"RegionId = -1"},{"key":"f3","value":"RegionIdText = \'All\'"},{"key":"f4","value":"FacilityTypeID = 0"},{"key":"f5","value":"FacilityTypeIDText = \'All\'"},{"key":"f6","value":"NeedStatus = 1,2,5,6"},{"key":"f7","value":"NeedStatusText = \'Non Assigned; Applied; Partial Assigned; Reopened/Cancelled By Caregiver\'"},{"key":"columns","value":"StartDate,EndDate,FacilityName,UnitName,Duration,NumOfNeeds,NumOfAssigned,DesiredShift,DegreeName,TypeName,RegionName,City,StateIDName,PlPayRate,Description,PostDate,Candidates,Id"},{"key":"orderBy","value":"Id"},{"key":"pageCount","value":"true"},{"key":"pageNumber","value":1},{"key":"pageSize","value":999999},{"key":"reqInd","value":2}]',
    method: "POST",
    mode: "cors",
    credentials: "include",
  }
);

const data = await apiRes.json();
// await fs.writeFile(`full.json`, JSON.stringify(data));
console.log({ allTimeTotal: data.rows.length });

const endDate = new Date(new Date().toDateString());
const startDate = date.addDays(endDate, -7);

console.log({
  startDate,
  endDate,
  totalDayCount: date.subtract(endDate, startDate).toDays(),
});

const filteredData = data.rows.filter((row) =>
  process.env.GET_ALL
    ? true
    : date.subtract(startDate, new Date(row.PostDate)).toMilliseconds() <= 0
);

const dateSet = new Set(filteredData.map((row) => row.PostDate.split("T")[0]));
//filteredData.forEach((row) => consol.log(row.PostDate))
console.log(dateSet);
const finalJson = filteredData.map((row) => {
  const payDetailsLines = row.PayDetail?.split("\n");
  const payDetails = {};
  payDetailsLines?.map((line) => {
    const [key, value] = line.split(":");
    if (key === "-Wkly Stipend")
      payDetails.wklyStipend = value.match(/\d+\.?\d*/g)[0];
    if (key === "-Gross Wkly Pay")
      payDetails.grossWklyPay = value.match(/\d+\.?\d*/g)[0];
    if (key === "-FINDNETICS RECRUITMENT BONUS")
      payDetails.findneticsRecruitmentBonus = value.match(/\d+\.?\d*/g)[0];
  });

  const $ = cheerio.load(row.Description.split("</ul>")[0] + "</ul>")

  let title = ""

  $("li").each((i, el) => {
    if (/title/i.test($(el).text())){
      title = $(el).text().split(':')[1].trim()
    }
  })

  return {
    scId: row.scId,
    scRegionID: row.scRegionID,
    objtype: row.objtype,
    Id: row.Id,
    StatusID: row.StatusID,
    StartDate: row.StartDate.split("T")[0],
    EndDate: row.EndDate.split("T")[0],
    PostDate: row.PostDate.split("T")[0],
    FacilityID: row.FacilityID,
    FacilityName: row.FacilityName,
    UnitName: row.UnitName,
    Duration: row.Duration,
    NumOfNeeds: row.NumOfNeeds,
    NumOfAssigned: row.NumOfAssigned,
    HotJobFl: row.HotJobFl,
    SCOnly: row.SCOnly,
    IsOccupy: row.IsOccupy,
    DesiredShift: row.DesiredShift,
    DegreeName: row.DegreeName,
    TypeName: row.TypeName,
    AlternateTypeName: row.AlternateTypeName,
    RegionName: row.RegionName,
    City: row.City,
    StateID: row.StateID,
    StateIDName: row.StateIDName,
    Title: title,
    Description: row.Description.split("</ul>")[0] + "</ul>",
    DescriptionPlainText: row.DescriptionPlainText,
    PayDetail: row.PayDetail,
    wklyStipend: "",
    grossWklyPay: "",
    findneticsRecruitmentBonus: "",
    ...payDetails,
    ExpectedSalary: row.ExpectedSalary,
    SubmissionCount: row.SubmissionCount,
    SubmissionHint: row.SubmissionHint,
    PlPayRate: row.PlPayRate,
    PlBillRate: row.PlBillRate,
    AvailableProposals: row.AvailableProposals,
    CandidatesList: row.CandidatesList,
    IsPermanentPlacement: row.IsPermanentPlacement,
    ASAP: row.ASAP,
    CategoryID: row.CategoryID,
    UnitDescription: row.UnitDescription,
    OnHold_Fl: row.OnHold_Fl,
    DegreeId: row.DegreeId,
    TypeId: row.TypeId,
    UnitId: row.UnitId,
    AlternateDegreeID: row.AlternateDegreeID,
    AlternateDegreeName: row.AlternateDegreeName,
    AlternateTypeID: row.AlternateTypeID,
  };
});

console.log({ sevenDayTotal: filteredData.length });

const opts = {};
const transformOpts = {};
const asyncOpts = {};
const parser = new AsyncParser(opts, asyncOpts, transformOpts);

const csv = await parser.parse(finalJson).promise();

// const transporter = nodemailer.createTransport({
//   host: process.env["SMTP_HOST"],
//   port: process.env["SMTP_PORT"],
//   secure: false,
//   auth: {
//     user: process.env["SMTP_USER"],
//     pass: process.env["SMTP_PASS"],
//   },
//   tls: {
//     ciphers: "SSLv3",
//   },
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env["GMAIL_ID"],
    pass: process.env["GMAIL_PASS"],
  },
});

const info = await transporter.sendMail({
  from: `Bluesky Scraper BOT <${process.env["GMAIL_ID"]}>`, // sender address
  to: process.env["RECIVER_EMAIL"], // list of receivers
  subject:
    (process.env.GET_ALL
      ? "All"
      : `[${startDate.toISOString().split("T")[0]}-TO-${
          date.addDays(endDate, -1).toISOString().split("T")[0]
        }]`) + ` ${filteredData.length} Job - Bluesky Scraper Bot`, // Subject line
  attachments: [
    {
      filename: process.env.GET_ALL
        ? `All-${filteredData.length}.csv`
        : `${startDate.toISOString().split("T")[0]}_${
            date.addDays(endDate, -1).toISOString().split("T")[0]
          }.csv`,
      content: csv,
    },
  ],
});
