<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        div{
           background-color:chocolate;
           border-style: solid;
           border-width: 1px;
           max-width: 750px;
           text-align: center;
           font-family: 'Times New Roman';
           padding: 50px;
           margin: auto;
       }</style>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple WebGL</title>
</head>
<body onload="main()">
    <div id="Div1">
        <h1>Simple WebGL Application</h1>
    <canvas width="750" height="750" id="myCanvas" style="border: 1px solid black;">
        Your browser does not support WebGL rendering.
    </canvas>
    <script src="jar-left.js"></script>
    <script src="jar-right.js"></script>
    <script src="lightbox.js"></script>
    <script src="plane.js"></script>
    <script src="gl-matrix-min.js"></script>
    <script src="main.js"></script> 

</div>
</body>
</html>
