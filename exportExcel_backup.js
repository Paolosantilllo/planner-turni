console.log("📊 EXPORT EXCEL CARICATO");
console.log("ExcelJS:", ExcelJS);

window.exportExcel = async function(){

  console.log("📊 Avvio esportazione Excel");

console.log(
  "EVENTI EXCEL:",
  window.savedEvents
);

console.log(
  "NUMERO EVENTI:",
  window.savedEvents?.length
);

console.log(
  "DIPENDENTI EXCEL:",
  window.employeesData
);

console.log("EVENTI DISPONIBILI:", window.savedEvents);
console.log("DIPENDENTI DISPONIBILI:", window.employeesData);

  const workbook = new ExcelJS.Workbook();


  workbook.creator = "Planner REP";
  workbook.created = new Date();

const currentDate = new Date();

const baseYear = currentDate.getFullYear();
const baseMonth = currentDate.getMonth();

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile",
  "Maggio","Giugno","Luglio","Agosto",
  "Settembre","Ottobre","Novembre","Dicembre"
];


const sheet = workbook.addWorksheet(
  monthNames[baseMonth] + " " + baseYear
);


// dati provenienti da app.js
const events = window.savedEvents || [];
const employees = window.employeesData || {};


console.log("📅 MESE EXCEL:", monthNames[baseMonth], baseYear);
console.log("📌 EVENTI EXCEL:", events);
console.log("👥 DIPENDENTI EXCEL:", employees);


sheet.mergeCells("A1:F1");


  const title = sheet.getCell("A1");

  title.value = "Reperibilità PLF";

  title.font = {
    bold:true,
    size:16
  };

  title.alignment = {
    horizontal:"center"
  };


  sheet.getCell("A3").value = "Versione";
  sheet.getCell("B3").value = "1/1";


  sheet.getRow(5).values = [
    "Nominativi",
    1,
    2,
    3,
    4,
    5
  ];


  sheet.getColumn(1).width = 25;


  for(let i=2;i<=6;i++){

    sheet.getColumn(i).width = 8;

  }


  await sheet.protect(
    "planner",
    {
      selectLockedCells:false,
      selectUnlockedCells:false
    }
  );


  const buffer =
    await workbook.xlsx.writeBuffer();


  const blob = new Blob(
    [buffer],
    {
      type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  );


  const url =
    URL.createObjectURL(blob);


  const a =
    document.createElement("a");


  a.href = url;

  a.download =
    "Reperibilita_PLF.xlsx";


  a.click();


  URL.revokeObjectURL(url);


};
