//Requires
const { json } = require("body-parser");
const fs = require("fs");


let Storage = (function () {
  let getJSONData = function (name) {
    let data = fs.readFileSync(name + ".json", "utf8");
    return JSON.parse(data);
  };

  let editJSONData = function (name, edit) {
    fs.readFile(name + ".json", function (err, content) {
      if (err) throw err;
      let inputVar = JSON.parse(content);

      inputVar = edit;

      let json = JSON.stringify(inputVar);

      fs.writeFile(
        __dirname + name + ".json",
        json,
        "utf8",
        function (err) {
          if (err) throw err;
        }
      );
    });
  };

  let saveJSONData = (name, JSONObject) => {
    fs.writeFile(
      name + ".json",
      JSON.stringify(JSONObject),
      {
        encoding: "utf8",
        flag: "w",
        mode: 0o666,
      },
      (err) => {
        if (err) throw err;
      }
    );
  };

  let storeLeaderboard = (leaderboard, infoAdded)=>{
    let editedLeaderboard = leaderboard;
    editedLeaderboard[editedLeaderboard.length] = infoAdded;
    editedLeaderboard.sort((a,b)=>(Number(a.score) > Number(b.score))? -1 : 1);
    if(editedLeaderboard.length>100){
      editedLeaderboard.splice(100,editedLeaderboard.length-1);
    }
    return editedLeaderboard;
  }

  //============================================================================
  //============================================================================
  // Returned Object
  return {
    getData: (name) => getJSONData(name),
    editData: (name, edit) => editJSONData(name, edit),
    saveData: (name, JSONObject) => saveJSONData(name, JSONObject),
    storeLB: (leaderboard, infoAdded) => storeLeaderboard(leaderboard, infoAdded),
  };
})();

module.exports = Storage;