console.log("📊 EXPORT EXCEL CARICATO");

window.exportExcel = async function(){

console.log("🚨 EXPORT EXCEL VERSIONE NUOVA");

  console.log("📊 Avvio esportazione Excel");


  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Planner REP";
  workbook.created = new Date();


  const events = window.savedEvents || [];
  const employees = window.employeesData || {};


  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();


  const monthNames = [
    "Gennaio","Febbraio","Marzo","Aprile",
    "Maggio","Giugno","Luglio","Agosto",
    "Settembre","Ottobre","Novembre","Dicembre"
  ];


  const sheet = workbook.addWorksheet(
    monthNames[month] + " " + year
  );


  const daysInMonth =
    new Date(year, month + 1, 0).getDate();


  const weekNames = [
    "D","L","Ma","Me","G","V","S"
  ];


// ======================
// 📌 TITOLO
// ======================

sheet.mergeCells(
  1,
  1,
  1,
  daysInMonth + 1
);


const title = sheet.getCell("A1");

title.value =
  "Reperibilità PLF";


title.font = {
  bold:true,
  size:16
};


title.alignment = {
  horizontal:"center"
};


// ======================
// 📌 TITOLO MENSILE
// ======================

sheet.mergeCells(
  3,
  1,
  3,
  daysInMonth + 1
);


const monthTitle = sheet.getCell("A3");


monthTitle.value =
  "Reperibilità specialisti PLF del mese di " +
  monthNames[month].toUpperCase() +
  " " +
  year;


monthTitle.font = {
  bold:true,
  size:12
};


monthTitle.alignment = {
  horizontal:"center"
};


// ======================
// 📌 VERSIONE + INVIO
// ======================

const now = new Date();

const dataInvio =
now.toLocaleDateString("it-IT")
+
" "
+
now.toLocaleTimeString("it-IT");


const infoColumn =
daysInMonth + 4;


"Versione: 1/1";sheet.getCell(1,infoColumn).value =
"Inviato il: " + dataInvio;



sheet.getCell(2,infoColumn).value =
"Versione: 1/1";


sheet.getCell(1,infoColumn).alignment = {
  horizontal:"right"
};


sheet.getCell(2,infoColumn).alignment = {
  horizontal:"right"
};


sheet.getCell(1,infoColumn).font = {
  bold:true
};

  // ======================
  // INTESTAZIONE
  // ======================


  const header = [
    "Nominativi"
  ];


  for(let d=1; d<=daysInMonth; d++){
    header.push(d);
  }


  sheet.getRow(6).values = header;


  const weekRow = [
    ""
  ];


  for(let d=1; d<=daysInMonth; d++){

    weekRow.push(
      weekNames[
        new Date(year,month,d).getDay()
      ]
    );

  }


  sheet.getRow(7).values = weekRow;


// ======================
// BLOCCA COLONNA NOMINATIVI
// ======================



  // ======================
  // NOMINATIVI
  // ======================


  Object.keys(employees).forEach(id=>{


    const row = [
      employees[id].name
    ];


    for(let d=1; d<=daysInMonth; d++){


      const date =
      `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;


      const ev = events.find(e =>
        e.date === date &&
        e.employee === id
      );


      row.push(
        ev ? ev.shift : ""
      );


    }


    sheet.addRow(row);


  });



  // ======================
  // FORMATTAZIONE
  // ======================


  sheet.getColumn(1).width = 22;


  for(let i=2;i<=daysInMonth+1;i++){
    sheet.getColumn(i).width = 8;
  }



  sheet.eachRow(row=>{

    row.eachCell(cell=>{

cell.alignment = {
  horizontal:"center",
  vertical:"middle",
  wrapText:false
};

      cell.border = {
        top:{style:"thin"},
        left:{style:"thin"},
        bottom:{style:"thin"},
        right:{style:"thin"}
      };

    });

  });



  // ======================
  // COLORI CELLE
  // ======================


  sheet.eachRow((row,rowNumber)=>{


    if(rowNumber < 8)
      return;


    row.eachCell((cell,col)=>{


      const value = cell.value;


      if(value==="CFI" || value==="CFI/REP"){

        cell.fill = {
          type:"pattern",
          pattern:"solid",
          fgColor:{argb:"66BB6A"}
        };

      }


      if(value==="REP" || value==="FREP"){

        cell.fill = {
          type:"pattern",
          pattern:"solid",
          fgColor:{argb:"DCC8BE"}
        };

      }


      if(value==="LIC" || value==="REC"){

        cell.fill = {
          type:"pattern",
          pattern:"solid",
          fgColor:{argb:"FFEB3B"}
        };

      }


      if(value==="MAL"){

        cell.fill = {
          type:"pattern",
          pattern:"solid",
          fgColor:{argb:"EEEEEE"}
        };

      }


    });


  });

// ======================
// IMPOSTAZIONE PAGINA
// ======================

sheet.pageSetup = {
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0
};


  // ======================
  // PROTEZIONE
  // ======================


  // await sheet.protect(
  // "planner",
  // {
  // selectLockedCells:false,
  // selectUnlockedCells:false
  // }
  // );



  // ======================
  // DOWNLOAD
  // ======================


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


  a.href=url;

  a.download =
    `Reperibilita_PLF_${monthNames[month]}_${year}.xlsx`;


  a.click();


  URL.revokeObjectURL(url);


  console.log("✅ Excel creato");


};
