

const toNum = d => parseInt(d.replace(',',''));

function calculateAverage(data,column){
  var sum=0;
  for (var row = 0; row < data.length; row++) {
    sum+=data[row][column];
  }
  return sum/data.length;
}

//Based on https://stackoverflow.com/questions/38064029/d3-modifying-column-names
function formatCSV(d){
    Object.keys(d).forEach(function(key) {

        //First parse all numbers from strings to int
        if(key!="State"){
          d[key] = toNum(d[key]);
        }       

        //Next change all keys (take out part after the commas)
        var splittedKey = key.split(",");
        if (splittedKey.length == 2) {
          d[splittedKey[0]] = d[key];
          delete d[key];
        }
     });
    return d;
};




//Wait until the page is loaded before we start to do thigs
document.addEventListener('DOMContentLoaded', () => {

  var files = []
  for (var i = 2007; i <= 2018; i++) {
    files.push("./Data/"+i.toString()+".csv");
  }

  var promises = [];
  var data =[];

  //Load all data from different files
  files.forEach(function(file_address) {
      promises.push(d3.csv(file_address, formatCSV));
  });

  //Load states geojson data
  promises.push(d3.json("./Data/states.json"));

  Promise.all(promises).then(function(values) {
    

    //Prepare data
    for (var i = 0; i< values.length-1; i++) {
      values[i].forEach(function(d) {
        d["Year"] = i+2007;
        data.push(d);
      });
    }

    var geodata = values[values.length-1];
    renderPage(data,geodata);
  });

});




function selectRows(d,column,value,equalComparison=true){
  
  if(equalComparison){
    if(d[column]===value){
      return true;
    }
    return false;
  }
  else{
    if(d[column]!==value){
      return true;
    }
    return false; 
  }
}


function calculateDomain(data,column){

  return data.reduce((acc, row) => {
    const val = row[column];
    return {
      min: Math.min(isFinite(val) ? val : Infinity, acc.min),
      max: Math.max(isFinite(val) ? val : -Infinity, acc.max)
    };
  }, {min: Infinity, max: -Infinity});

}


function renderPage(data,geodata){

  //Declare dimensions of plotting area
  const height = 500;
  const width = 900;
  const margin = {top: 80, left: 100, right: 350, bottom: 50};

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.bottom - margin.top;

  //Calculate domains of x and y variables. We will use this for scalling
  const xDomain = data.reduce((acc, row) => {
    return {
      min: Math.min(row["Year"], acc.min),
      max: Math.max(row["Year"], acc.max)
    };
  }, {min: Infinity, max: -Infinity});

  //Scale for x acis: # of homeless programs
  const xScale = d3.scaleLinear()
    .domain([xDomain.min, xDomain.max])
    .range([0,plotWidth]); 


  // We create the svg, and set height and width 
  const svg_plot = d3.select('.plot')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
  
  const g =  svg_plot.append('g')
    .attr('transform',`translate(${margin.left},${margin.top})`);



  createMap();

  var all_selected_data=[];
  var firstUpdate=true;

  function updateLine(column, state,removeState=false){

    if(firstUpdate){
      firstUpdate=false;

      //X axis
      g.append('g')
        .call(d3.axisBottom(xScale))
        .attr('transform', `translate(0,${plotHeight})`);
      
      //Axis labels
      g.append("text")
        .attr("x", plotWidth/2)
        .attr("y", plotHeight+margin.bottom*2/3 )
        .style("text-anchor", "middle")
        .attr('font-size', 14)
        .text("Year");  

      g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -plotHeight/2)
            .attr("y", -margin.left*2/3)
            .attr('font-size', 14)
            .style("text-anchor", "middle")
            .text("Number of homeless");

      

      //Caption
      const caption = svg_plot.selectAll('.caption')
                          .data([{x: plotWidth-300, y: height-3,
                                  label: 'Source: U.S. Department of Housing and Urban Development (HUD)'}]); 
      caption.enter()
        .append('text')
        .attr('class', 'caption')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('text-anchor', 'left')
        .attr('font-size', 14)
        .attr('font-family', 'georgia')
        .attr('font-style', 'italic')
        .text(d => d.label);
    }
    
    var duration1=2000;

    var selected_data= data.filter(function(d){
            return isFinite(d[column]) && selectRows(d,"State",state);
          })


    if(removeState){
      //remove each element of selected_data from all_selected_data
      selected_data.forEach(function(data){
        var index = all_selected_data.indexOf(data);
        all_selected_data.splice(index, 1);
      });
    }
    else{
      //Include each element of selecte_data in all_selected_data
      selected_data.forEach(function(data){
        all_selected_data.push(data);
      });
    }

    var yDomain = calculateDomain(all_selected_data,"Overall Homeless");
  
    //Scale for y axis: # of homeless people
    const yScale = d3.scaleLinear()
      .domain([0, yDomain.max*1.01])
      .range([plotHeight,0]); 


    //Axis
    // var y_axis = g.selectAll(".y_axis")
    //   .data(all_selected_data, function (d) { return d })// COMO FUNCIONA ESTO ENTNDER


    // var enter = y_axis.enter()
    //   .append('g')
    //   .attr("class", "y_axis")
    //   .transition()
    //   .duration(1000)
    //   .call(d3.axisLeft(yScale));


    // y_axis.exit()
    //   .transition()
    //   .duration(0)
    //   // .attr("opacity", 0)
    //   .remove();




    //Remove old y axis
    d3.select(".y_axis").remove();

    //Create new y axis
    var y_axis = g.append('g')
      .attr("class", "y_axis")
      .transition()
      .duration(1000)
      .call(d3.axisLeft(yScale));  


    //Title
    var title = svg_plot.selectAll('.title')
          .data(selected_data, function (d) { return d["State"] });
    
    title.enter()
      .append('text')
      .attr('class', 'title')
      .attr('x', margin.left) 
      .attr('y', margin.top/2)
      .attr('text-anchor', 'left')
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('Homeless in '+ state);

    title.exit()
      .transition()
      .duration(1000)
      .attr("opacity", 0)
      .remove();
    

    var overall_line = d3.line()
        .x(function(d) { return xScale(d["Year"]); }) 
        .y(function(d) { return yScale(d[column]); })
        .curve(d3.curveMonotoneX); // apply smoothing to the line

    var nested_data = d3.nest().key(function(d){return d["State"];}).entries(all_selected_data);
    console.log(nested_data)

    var lines = g.selectAll(".line_overall")
      .data(nested_data, function (d) { return d["key"] }) 
    
    var new_path = lines.enter()
      .append("path")
      .attr("class", "line_overall")
      .attr("d", function(d) { return overall_line(d.values); });


    lines.merge(new_path)
      .transition()
      .duration(1000)
      .attr("d", function(d) { console.log("d");console.log(d);return overall_line(d.values) });

    lines.exit()
    .transition()
    .duration(duration1)
    .attr("opacity", 0)
    .remove();


    //Used http://bl.ocks.org/duopixel/4063326 for animation
    console.log("new_path");
    console.log(new_path);
    if(!removeState){

      var totalLength = new_path.node().getTotalLength();

      new_path
        .attr("stroke-dasharray", totalLength) // the higer the dasharray, the longer the dashe
        .attr("stroke-dashoffset", totalLength) //where does the offset begins
        .transition()
        .duration(duration1)
        .ease(d3.easeLinear) // speed at which the path transitions
        .attr("stroke-dashoffset", 0);//where does the offset ends      
    }
    


    // line.exit()
    // .transition()
    // //.duration(1000)
    // .attr("opacity", 0)
    // .remove();


    //Legend
    var rect_legend = g.selectAll(".rect")
      .data(selected_data, function (d) { return d["State"] });// ??
    

    rect_legend
      .enter()
      .append("rect")
      .transition()
      .duration(duration1)
      .attr('class', 'rect overall')
      .attr('height',20)
      .attr('width',20)
      .attr('x', plotWidth+10)
      .attr('y', yScale(calculateAverage(selected_data,column)))
      .attr("opacity", 0.2);
      
    rect_legend.exit()
    .transition()
    .attr("opacity", 0)
    .remove();

    var text_legend = g.selectAll(".text_legend")
      .data(selected_data, function (d) { return d["State"] });
    

    text_legend
      .enter()
      .append("text")
      .transition()
      .duration(duration1)   
      .attr('class', 'text_legend overall')
      .attr('height',20)
      .attr('width',20)
      .attr('x', plotWidth+35)
      .attr('y', 15+yScale(calculateAverage(selected_data,column)))
      .text(column)
      .attr("opacity", 0.2);

    text_legend.exit()
    .transition()
    .attr("opacity", 0)
    .remove();
  }


  //Used https://github.com/mcnuttandrew/capp-30239/tree/master/week-8-map
  //Used https://d3indepth.com/geographic/
  function createMap(){


    var map_width = 800;
    var map_height = 500;

    // we're going to be coloring our cells based on their homeless population so we should compute the
    // population domain

    var states_data= data.filter(function(d){
            return isFinite(d["Overall Homeless"]) && selectRows(d,"State","Total",false);
          })




    const homelessDomain = calculateDomain(states_data,"Overall Homeless");//computeDomain(statePops, 'pop');
   
    
    var colorScale = d3.scaleLinear()
    .domain([homelessDomain.min, homelessDomain.max])
    .range(["#43bb38", "#e41a1c"]);


    var data_2018= data.filter(function(d){
            return isFinite(d["Year"]) && selectRows(d,"Year",2018);
          })

    //Create map from state to number of homeless in 2018, used for coloring
    const state_to_pop = data_2018.reduce((acc, row) => {
      acc[row.State] = row["Overall Homeless"];
      return acc;
    }, {});



    var projection = d3.geoAlbers()//geoEquirectangular();
     .scale(900)
     .translate([350, 250]);

    var geoGenerator = d3.geoPath(projection);


    var svg_map = d3.select(".map")
            .append("svg")
            .attr("width", map_width)
            .attr("height", map_height)

    const g_map =  svg_map.append('g')
      .attr('transform',`translate(10,10)`);//${margin.left},${margin.top})`);


    g_map.selectAll(".state")
            .data(geodata.features)
            .enter()
            .append('path')
            .attr("class", "state")
            .attr("d", geoGenerator)
            .attr("id", function(d) { return states_to_abb[d.properties.State]; })

            .attr('stroke', 'black')
            .attr('fill', "lightgrey")
            .attr('fill', function(d){
              var a = colorScale(state_to_pop[states_to_abb[d.properties.State]]);

              return a;})
            .on("click", function(d) {
             
              if(d3.select(this).classed('selected')){
                //Remove!  
                console.log("Remove "+d3.select(this).attr("id"));
                updateLine("Overall Homeless",states_to_abb[d.properties.State],true);
                d3.select(this).classed('selected',false);
              }
              else{//Not selected
                //Include!
                console.log("Include "+d3.select(this).attr("id"));
                updateLine("Overall Homeless",states_to_abb[d.properties.State]);
                d3.select(this).classed('selected',true); 

              }


            });

    //Used https://d3-legend.susielu.com/
    svg_map.append("g")
      .attr("class", "legendLinear")
      .attr('transform',`translate(20,380)`);


    var legendLinear = d3.legendColor()
      .shapeWidth(30)
      .orient('vertical')
      .scale(colorScale)
      .title("Amount of homeless in 2018");

    svg_map.select(".legendLinear")
      .call(legendLinear);
  }
};




var states_to_abb  =
  {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'American Samoa': 'AS',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'District Of Columbia': 'DC',
    'Federated States Of Micronesia': 'FM',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Guam': 'GU',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Marshall Islands': 'MH',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Northern Mariana Islands': 'MP',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Palau': 'PW',
    'Pennsylvania': 'PA',
    'Puerto Rico': 'PR',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virgin Islands': 'VI',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'
  }