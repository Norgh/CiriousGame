let TableDraw = (function () {
    return{
       
        draw(number, data, line) {
            let table="";
            table += "<tbody>";
            if(number <= data.length){
                for (let i = 1; i <= number; i++) {
                    table += line(i, data);
                }
            }else{
                for (let i = 1; i <= data.length; i++) {
                    table += line(i, data);
                }
            }
            table += "</tbody>";
            return table;
        }
    }
})();

module.exports = TableDraw;