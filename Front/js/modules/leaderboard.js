let Scores = (function () {
    function getRankInfos(rank, data) {
      if (data[rank-1]!= undefined) {
        return data[rank-1];
      }
      return data[0]; //Si on trouve pas, on envoie le 1er pour éviter l'erreur
    }
  
    return {
      getRankData(rank, data) {
        // sert à rien pour l'instant, peut être utile si l'on complexifie le stockage
        let leaderboard = getRankInfos(rank, data);
        let line = new Object();
        line["username"] = leaderboard.username;
        line["score"] = leaderboard.score;
        line["time"] = leaderboard.time;
        return line;
      },

      getRankLine(rank, data) {
        let leaderboard = getRankInfos(rank, data);
        return (
          "<tr>" +
          "<td>" +
          rank +
          "</td>" +
          "<td>" +
          leaderboard.username +
          "</td>" +
          "<td>" +
          leaderboard.score +
          " </td></tr>"
        );
      },
    };
})();

module.exports = Scores;