import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import ReactPlayer from 'react-player'
import { SketchPicker } from 'react-color';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import * as THREE from "three";
import Select from "react-select";

import PCDPointCloud from './PCDPointCloud.js';
import MyCameraControls from './MyCameraControls.js'
import cv, { CV_32FC1 } from "@techstark/opencv-js"
import { Helmet } from "react-helmet"

const FileLoader = () => {
    //premenne drziace aktualne subory
    const [PCDfile,setPCDFile] = useState(null);
    const [rotFile, setRotFile] = useState(null);
    const [transFile, setTransFile] = useState(null);
    const [videoFileString, setVideoFileString] = useState('https://ondrejklima.cloud/xnemce08/cam_25FPS264.mp4');
    const [rotationOrderString, setRotationOrderString] = useState('YZX');

    //premenne pre UI prvky
    const [remapSliderValue, setRemapSliderValue] = useState(null);
    const [colorScaleCanvas, setColorScaleCanvas] = useState(null);

    //premenna drziaca aktualny snimok animacie
    const [frame_no, setFrame_no] = useState(0);

    //pomocne premenne pre UI
    const [visualisationWidth, setVisualisationWidth] = useState(null);
    const [visualisationHeight, setVisualisationHeight] = useState(null);
    const [pageLoaded, setPageLoaded] = useState(false);

    //status bar
    const [statusMessage, setStatusMessage] = useState("");
    const [statusReady, setStatusReady] = useState(false);
    const [errorStatus, setErrorStatus] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    //status bar: premenne pre status nacitavania jednotlivych elementov / suborov
    const [canvasSizeLoaded, setCanvasSizeLoaded] = useState(false);
    const [openCVLoadedStatus, setOpenCVLoadedStatus] = useState(false);
    const [distortionLoaded, setDistortionLoaded] = useState(false);
    const [rangeSliderLoaded, setRangeSliderLoaded] = useState(false);
    const [defaultPCDLoaded, setDefaultPCDLoaded] = useState(false);

    const [drawingNewPointsLoaded, setDrawingNewPointsLoaded] = useState(false);
    const [loadingIntensitiesLoaded, setLoadingIntensitiesLoaded] = useState(false);
    const [settingHistogramLoaded, setSettingHistogramLoaded] = useState(false);

    const [realtimeFileArrayLoaded, setRealtimeFileArrayLoaded] = useState(false);
    const [realtimeTimestampsLoaded, setRealtimeTimestampsLoaded] = useState(false);
    const [realtimeInitialPointsLoaded, setRealtimeInitialPointsLoaded] = useState(false);
    const [realtimeIntensitiesLoaded, setRealtimeIntensitiesLoaded] = useState(false);

    const [cameraPositionsLoaded, setCameraPositionsLoaded] = useState(false);
    const [cameraRotationsLoaded, setCameraRotationsLoaded] = useState(false);
    
    //nacitanie vychodiskoveho pcd suboru
    useEffect(() => {
        setStatusMessage("Loading default PCD file");

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "./pcd/scans_joined.pcd", true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            var pointCloudFile = new File([xhr.response], "scans_joined.pcd")
            setPCDFile(pointCloudFile);

            setDefaultPCDLoaded(true);

        };
        xhr.send(); 
      }, []);


    //obrazovka pre upload novych suborov
    const [showUploadScreen, setShowUploadScreen] = useState(false)

    function handleUploadButton(){
        setShowUploadScreen(!showUploadScreen);
    }


    //UI
    useEffect(()=>{
        if(pageLoaded){
            var c = document.getElementById("myCanvas");
            setColorScaleCanvas(c);
        }
    },[pageLoaded])


    // spracovanie uzivatelom nahratych suborov
    //aktualne nahrate subory na upload obrazovke
    const [pcdFileTemp, setPcdFileTemp] = useState(null);
    const [rotFileTemp, setRotFileTemp] = useState(null);
    const [transFileTemp, setTransFileTemp] = useState(null);
    const [videoFileStringTemp, setVideoFileStringTemp] = useState(null)
    const [rotationOrderStringTemp, setRotationOrderStringTemp] = useState(null)

    //premenna pre chybove spravy uploadovania
    const [uploadScreenMessage, setUploadScreenMessage] = useState("")

    //reakcia na zavretie upload okna
    useEffect(()=>{
        if(!showUploadScreen){
            setPcdFileTemp(null)
            setRotFileTemp(null)
            setTransFileTemp(null)
            setVideoFileStringTemp(null);
            setRotationOrderStringTemp(null);
            setOldOrder("");

            setUploadScreenMessage("");
        }
    },[showUploadScreen])

    //kontrola nahratych suborov
    useEffect(()=>{
        if(pcdFileTemp){
            var re = /(?:\.([^.]+))?$/;
            var filetype = re.exec(pcdFileTemp.name)[1];
            if(filetype != "pcd"){
                setUploadScreenMessage("Error: Wrong file type");
                setPcdFileTemp(null);
            }else{
                setUploadScreenMessage("");
            }
        }
    },[pcdFileTemp])

    useEffect(()=>{
        if(rotFileTemp){
            var re = /(?:\.([^.]+))?$/;
            var filetype = re.exec(rotFileTemp.name)[1];
            if(filetype != "csv"){
                setUploadScreenMessage("Error: Wrong file type");
                setRotFileTemp(null);
            }else{
                setUploadScreenMessage("");
            }
        }
    },[rotFileTemp])

    useEffect(()=>{
        if(transFileTemp){
            var re = /(?:\.([^.]+))?$/;
            var filetype = re.exec(transFileTemp.name)[1];
            if(filetype != "csv"){
                setUploadScreenMessage("Error: Wrong file type");
                setTransFileTemp(null);
            }else{
                setUploadScreenMessage("");
            }
        }
    },[transFileTemp])

    //reakcia na kliknutie tlacidla "Upload" na upload obrazovke
    function handleUploadFiles(){
        if(pcdFileTemp){
            setPCDFile(pcdFileTemp);
        }
        if(rotFileTemp){
            setRotFile(rotFileTemp);
        }
        if(transFileTemp){
            setTransFile(transFileTemp);
        }
        if(videoFileStringTemp){
            setVideoFileString(videoFileStringTemp);
        }
        if(rotationOrderStringTemp){
            setRotationOrderString(rotationOrderStringTemp)
        }
        setUploadScreenMessage("");
        setShowUploadScreen(false);
    }

    //chyba pri spracovani zadaneho videa
    function videoErrorCallback(){
        setVideoFileString('https://ondrejklima.cloud/xnemce08/cam_25FPS264.mp4');
        setErrorStatus(true);
        setErrorMessage("Invalid video URL");
        setTimeout(() => {
            setErrorStatus(false);
            setErrorMessage("");
        }, 4000);
    }

    //restrikcia pri zadavani poradia rotacii
    const [oldOrder, setOldOrder] = useState("");
    function restrictRotationOrderString(e){
        if(/^[XYZxyz]+$/.test(e)){
            setRotationOrderStringTemp(e)
            setOldOrder(e);
        }else{
            setRotationOrderStringTemp(oldOrder);
        }
    }
    

    //zmena FPS animacie
    function validateFPSTemp(e){
        //skontroluje ci obsahuje iba cisla
        if(/(^[0-9]*$)/.test(e)){
            setFPSTemp(e);
        }
    }

    const [FPSTemp, setFPSTemp] = useState(10);
    const [animationFPS, setAnimationFPS] = useState(10);
    function updateFPS(){
        if(!isNaN(parseInt(FPSTemp))){
            setAnimationFPS(parseInt(FPSTemp));
        }
    }
    
    
    //zmena pozadia
    const [overlayShown, setOverlayShown] = useState(true);
    const handleSwitchOverlay = () => {
        setOverlayShown(!overlayShown)
    }

    
    //ovladacie prvky videa
    const playerRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [played, setPlayed] = useState(0);
    const [playedActual, setPlayedActual] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(()=>{
        setPlayedActual(Math.round((played * duration) * 100) / 100);
    },[played])

    const handlePlayPause = () => {
        setPlaying((prev) => !prev);
    };

    const seekForward = () => {
        playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10);
    };

    const seekBackward = () => {
        playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            switch (event.key) {
                case ' ':
                    handlePlayPause();
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    seekForward();
                    break;
                case 'ArrowLeft':
                    seekBackward();
                    break;
                default:
                    break;
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePlayPause, seekForward, seekBackward]);


    // synchronizacia animacie podla videa
    useEffect(() => {
        setFrame_no(Math.round(played * duration * animationFPS))          //po kazdej zmene played updatne na korespondujuci frame
        updateValue();
    }, [played])


    //zmena farby / pouzitia intenzit
    const [color, setColor] = useState({
        r: 255,
        g: 255,
        b: 255,
        a: 1,
    });              
    //aktualna farba vybrana na color pickeri
    const [PCDColor, setPCDColor] = useState(["intensities", { r: 255, g: 255, b: 255, a: 1 }])  //color, s extra informacou ci ide o solidnu farbu alebo farbu s intenzitami. posiela sa komponentu na vykreslenie pointcloudu
    const [useIntensities, setUseIntensities] = useState(true)  //hodnota checkboxu pouzitia intenzit
    function handleColorChangeSolid(newColor){
        setColor(newColor.rgb)
        if(showSolidColor){
            if(useIntensities){
                setPCDColor(["intensities", newColor.rgb]);
            }
            else{
                setPCDColor(["solid", newColor.rgb]);
            }
        }
    }

    function handleColorChangeIntensities(){
        setUseIntensities(!useIntensities);
        if(showSolidColor){
            if(!useIntensities){
                setPCDColor(["intensities", PCDColor[1]]);
            }
            else{
                setPCDColor(["solid", PCDColor[1]]);
            }
        }
    }


    //vykreslenie histogramu 
    ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    );  

    const [chartOptions, setChartOptions] = useState({
    plugins: {
        title: {
        display: false,
        text: 'Intensities',
        },
        customCanvasBackgroundColor: {
            color: 'lightGreen',
        },
        legend: {
            display: false
        },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            title: {
            display: false,
            text: 'Number of points'
            },
            grid: {
                display: false
            },
            ticks:{
                display: false
            },
        },
        x: {
            title: {
                display: false,
                text: 'Intensity'
            },
            grid: {
                display: false
            },
        },
    },
    })

    const [chartData, setChartData] = useState(null)


    //slider pre filter a na linearne premapovanie farieb podla intenzit
    const [sliderValue, setSliderValue] = useState(null)
    const [maxChartIntensity, setMaxChartIntensity] = useState(null);
    const [minChartIntensity, setMinChartIntensity] = useState(null);


    //color scale
    const [colorScaleSteps, setColorScaleSteps] = useState(10);
    const [colorScaleStepsInput, setColorScaleStepsInput] = useState(10);
    const [colorSelectDropdown, setColorSelectDropdown] = useState([new THREE.Color( "red" ), new THREE.Color( "blue" )]);
    const [colorScaleArray, setColorScaleArray] = useState(null);
    const [colorScaleOpacity, setColorScaleOpacity] = useState(1);
    const [scaleSliderValue, setScaleSliderValue] = useState([0,310])

    function handleColorScaleStepsChange(newVal){
        setColorScaleStepsInput(newVal)
        if(newVal >= colorSelectDropdown.length){
            setColorScaleSteps(newVal);
        }
        else{
            setColorScaleSteps(colorSelectDropdown.length)
        }
    }

    function handleColorScaleOpacity(opacityValue){
        setColorScaleOpacity(opacityValue);
        if(showColorScale){
            setPCDColor(["scale", colorScaleArray, opacityValue, scaleSliderValue]);
        }
    }

    const selectOptions = [
        { value: [new THREE.Color( "red" ), new THREE.Color( "blue" )], label: "Red>Blue" },
        { value: [new THREE.Color( "#964B00" ), new THREE.Color( "#FFFF00" )], label: "Brown>Yellow"},
        { value: [new THREE.Color( "blue" ), new THREE.Color( "white" ), new THREE.Color( "red" )], label: "Blue>White>Red"},
        { value: [new THREE.Color( "#FFFF00" ), new THREE.Color( "#964B00" ), new THREE.Color( "green" )], label: "Yellow>Brown>Green"},
        { value: [new THREE.Color( "blue" ), new THREE.Color( "green" ), new THREE.Color( "#FFFF00" ), new THREE.Color( "red" )], label: "Blue>Green>Yellow>Red"},
    ]

    function handleSelectChange(selectedOption){
        setScaleSliderValue([0,310]);
        setColorSelectDropdown(selectedOption.value);
        if(colorScaleSteps < selectedOption.value.length){
            setColorScaleSteps(selectedOption.value.length);
            setColorScaleStepsInput(selectedOption.value.length);
        }else if(colorScaleStepsInput != colorScaleSteps){
            setColorScaleStepsInput(colorScaleSteps);
        }
    }
    
    const [colorSelectDropdownPrevious, setColorSelectDropdownPrevious] = useState(null);
    const [colorScaleStepsPrevious, setcolorScaleStepsPrevious] = useState(null);

    const [showSolidColor, setShowSolidColor] = useState(true);
    const [showColorScale, setShowColorScale] = useState(false);

    // vytvorenie color scale canvasu / reakcia na zmenu steps / colors
    useEffect(() => {
        if(colorScaleCanvas){
            var color1 = colorSelectDropdown[0];
            var color2 = colorSelectDropdown[1];
            var color3 = colorSelectDropdown[2];
            var color4 = colorSelectDropdown[3];
            
            //zmena farieb slideru
            var attributeString1 = "20px solid rgb("
            var attributeStringLower = attributeString1.concat(color1.r * 255, ",", color1.g * 255,",",color1.b * 255,")");
            var attributeStringUpper = attributeString1.concat(colorSelectDropdown[colorSelectDropdown.length-1].r * 255,",", colorSelectDropdown[colorSelectDropdown.length-1].g * 255,",",colorSelectDropdown[colorSelectDropdown.length-1].b * 255,")");
            var newlink = document.querySelectorAll("#range-slider-scale .range-slider__thumb[data-lower]"); 
            newlink[0].style.setProperty("border-top", attributeStringLower);
            newlink = document.querySelectorAll("#range-slider-scale .range-slider__thumb[data-upper]"); 
            newlink[0].style.setProperty("border-top", attributeStringUpper);

            //vytvorenie pola farieb
            var color0 = new THREE.Color(0,0,0);
            var colorScaleColors = [];

            //vypocita nove pole farieb iba ak sa zmenilo
            if(colorSelectDropdown != colorSelectDropdownPrevious || colorScaleStepsPrevious != colorScaleSteps){
                setColorSelectDropdownPrevious(colorSelectDropdown);
                setcolorScaleStepsPrevious(colorScaleSteps);
                
                //vytvori pole farieb
                if(colorSelectDropdown.length == 2){
                    var colorScaleStep = 1 / (colorScaleSteps - 1);
                    for(var j = 0; j < colorScaleSteps; j++){
                        color0.lerpColors(color1,color2, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                }else if(colorSelectDropdown.length == 3){
                    var centerIndex = Math.floor(colorScaleSteps / 2 + 1);
                    var colorScaleStep = 1 / (centerIndex - 1);
                    for(var j = 0; j < centerIndex; j++){
                        color0.lerpColors(color1,color2, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                    colorScaleStep = 1 / (colorScaleSteps - centerIndex);
                    for(var j = 1; j <= colorScaleSteps - centerIndex; j++){
                        color0.lerpColors(color2,color3, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                }else if(colorSelectDropdown.length == 4){
                    var secondColorIndex = Math.floor(colorScaleSteps / 3 + 1);
                    var thirdColorIndex = Math.floor((colorScaleSteps * 2) / 3 + 1)
                    var colorScaleStep = 1 / (secondColorIndex - 1);
                    for(var j = 0; j < secondColorIndex; j++){
                        color0.lerpColors(color1,color2, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                    colorScaleStep = 1 / (thirdColorIndex - secondColorIndex);
                    for(var j = 1; j <= thirdColorIndex - secondColorIndex; j++){
                        color0.lerpColors(color2,color3, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                    colorScaleStep = 1 / (colorScaleSteps - thirdColorIndex);
                    for(var j = 1; j <= colorScaleSteps - thirdColorIndex; j++){
                        color0.lerpColors(color3,color4, j * colorScaleStep);
                        colorScaleColors.push(structuredClone(color0));
                    }
                }
            }else{
                colorScaleColors = colorScaleArray;
            }
            
            //nastavenie pola farieb pre komponent PCDPointCloud
            setColorScaleArray(colorScaleColors);

            //zobrazenie vytvorenych farieb
            var ctx = colorScaleCanvas.getContext("2d");
            var rgbString1 = "rgb(";
            
            //vyplni priestor pred prvym sliderom
            var rgbString = rgbString1.concat(colorScaleColors[0].r * 255,",",colorScaleColors[0].g * 255,",",colorScaleColors[0].b * 255,")");
            ctx.fillStyle = rgbString;
            ctx.fillRect(0, 0, scaleSliderValue[0], 50);

            //vyplni priestor za druhym sliderom
            var rgbString = rgbString1.concat(colorScaleColors[colorScaleColors.length - 1].r * 255,",",colorScaleColors[colorScaleColors.length - 1].g * 255,",",colorScaleColors[colorScaleColors.length - 1].b * 255,")");
            ctx.fillStyle = rgbString;
            ctx.fillRect(scaleSliderValue[1], 0, 310 - scaleSliderValue[1], 50);

            //vyplni linearne priestor medzi slidermi
            var step = (310 - scaleSliderValue[0] - (310 - scaleSliderValue[1])) / colorScaleSteps ;
            for(var k = 0; k < colorScaleSteps; k++){
                //vypocita farbu pre aktualny step a prevedie na string
                var rgbString = rgbString1.concat(colorScaleColors[k].r * 255,",",colorScaleColors[k].g * 255,",",colorScaleColors[k].b * 255,")");
                ctx.fillStyle = rgbString;
                ctx.fillRect(scaleSliderValue[0] + k*step, 0, step, 50);
            }

            if(showColorScale){
                setPCDColor(["scale", colorScaleColors,colorScaleOpacity,scaleSliderValue]);
            }
        }
    }, [colorScaleCanvas, colorScaleSteps, colorSelectDropdown, scaleSliderValue]);


    //Nastavenie color mode
    const colorModeOptions = [
        { value: "solid", label: "Solid Color" },
        { value: "scale", label: "Color Scale"},
    ]
    function handleColorModeChange(selectedOption){
        if(selectedOption.value == "solid"){
            setShowSolidColor(true);
            setShowColorScale(false);
            
            if(useIntensities){
                setPCDColor(["intensities", color]);
            }
            else{
                setPCDColor(["solid", color]);
            }
            
        }else{
            setShowSolidColor(false);
            setShowColorScale(true);
            setPCDColor(["scale", colorScaleArray, colorScaleOpacity,scaleSliderValue]);
        }
    }


    //update range slider hodnot po nacitani max a min intensity
    const [oldMaxChartIntensity, setOldMaxChartIntensity] = useState(null);
    const [oldMinChartIntensity, setOldMinChartIntensity] = useState(null);
    useEffect(() => {
        setStatusMessage("Updating range slider")
        setRangeSliderLoaded(false);

        if(oldMaxChartIntensity != null && oldMinChartIntensity != null){
            if(oldMaxChartIntensity == sliderValue[1] && oldMinChartIntensity == sliderValue[0]){
                setSliderValue([minChartIntensity, maxChartIntensity]);
            }else if(oldMaxChartIntensity == sliderValue[1] && oldMinChartIntensity != sliderValue[0]){
                setSliderValue([sliderValue[0], maxChartIntensity]);
            }
            else if(oldMaxChartIntensity != sliderValue[1] && oldMinChartIntensity == sliderValue[0]){
                setSliderValue([minChartIntensity, sliderValue[1]]);
            }
        }else{
            setSliderValue([minChartIntensity, maxChartIntensity]);
        }
        
        setOldMaxChartIntensity(maxChartIntensity);
        setOldMinChartIntensity(minChartIntensity);

        setRemapSliderValue([minChartIntensity, maxChartIntensity]);

        setRangeSliderLoaded(true)
    },[maxChartIntensity, minChartIntensity])


    // distortion
    const [openCVLoaded, setOpenCVLoaded] = useState(false);
    const [captureCanvas, setCaptureCanvas] = useState(null);
    const [videoElement, setVideoElement] = useState(null);
    const [newmatrix, setNewmatrix] = useState(null);
    const [mtx, setMtx] = useState(null);
    const [dist, setDist] = useState(null);
    const [dst, setDst] = useState(null);
    const [useDistortion, setUseDistortion] = useState(false);

    function handleUseDistortionChange(){
        setUseDistortion(!useDistortion);
    }

    useEffect(()=>{
        setStatusMessage("Loading OpenCV library");
        setOpenCVLoadedStatus(false);

        cv['onRuntimeInitialized']=()=>{
            setOpenCVLoaded(true);

            setOpenCVLoadedStatus(true);
        };
    },[]);

    useEffect(()=>{
        setPageLoaded(true);
    },[])

    useEffect(()=>{
        if(openCVLoaded && pageLoaded && visualisationWidth && visualisationHeight){
            setStatusMessage("setting initial OpenCV parameters");
            setDistortionLoaded(false);

            var canvas = document.getElementById('capture-canvas');     
            var videos = document.querySelectorAll("video");
            setVideoElement(videos[0]);
            canvas.width = visualisationWidth;
            canvas.height = visualisationHeight;
            setCaptureCanvas(canvas)

            setNewmatrix(cv.matFromArray(3, 3, CV_32FC1, [2.32673311e+03, 0.00000000e+00, 1.03198044e+03, 0.00000000e+00, 2.33384737e+03, 7.27376743e+02, 0.00000000e+00, 0.00000000e+00, 1.00000000e+00]))
            //adjusted for size
            //setNewmatrix(cv.matFromArray(3, 3, CV_32FC1, [2.33165578e+03, 0.00000000e+00, 1.03051509e+03, 0.00000000e+00, 2.34061366e+03, 7.29485553e+02, 0.00000000e+00, 0.00000000e+00, 1.00000000e+00]))
            setMtx(cv.matFromArray(3, 3, CV_32FC1, [2437.045995152957, 0, 1030.357276896143, 0, 2442.940955565279, 729.596404934511,0, 0, 1]))
            setDist(cv.matFromArray(5, 1, CV_32FC1, [-0.1832170424487164, 0.02691675026209955, -0.001191374354805736, 0.000804309339521888, 0.3354456739081583]))
            var dest = new cv.Mat();
            setDst(dest);

            setDistortionLoaded(true);
        }
    }, [openCVLoaded, pageLoaded, visualisationWidth, visualisationHeight]);

    useEffect(()=>{
        if(openCVLoaded && pageLoaded && useDistortion){
            captureCanvas.getContext('2d').drawImage(videoElement, 0, 0, visualisationWidth, visualisationHeight);  
            let src = cv.imread(captureCanvas);

            let dsize = new cv.Size(2052, 1540);
            var resized = new cv.Mat();
            cv.resize(src, resized, dsize);
        
            cv.undistort(resized, dst, mtx, dist, newmatrix);

            var final = new cv.Mat();
            let fsize = new cv.Size(visualisationWidth, visualisationHeight);
            cv.resize(dst, final, fsize);

            cv.imshow("outputCanvas", final);
        }
    },[frame_no])

    //pridanie / odstranenie canvasu na vykreslovanie obrazka bez skreslenia
    useEffect(()=>{
        if(captureCanvas){
            if(!useDistortion){
                var outputC = document.getElementById('outputCanvas');
                const contextC = outputC.getContext('2d');
                contextC.clearRect(0, 0, outputC.width, outputC.height);
                var wrapperCanvas = document.getElementById('distortion-canvas-wrapper');
                wrapperCanvas.setAttribute("style","background-color: transparent");
            }else{
                var wrapperCanvas = document.getElementById('distortion-canvas-wrapper');
                wrapperCanvas.setAttribute("style","background-color: black");
            }
        }
    }, [useDistortion])


    // manualne doladenie pozicie a rotacie kamery
    const [cameraPosition, setCameraPosition] = useState([0,0.1,0.4]);
    const [cameraRotation, setCameraRotation] = useState([0.006, 0, 0]);
    const [cameraOffset, setCameraOffset] = useState([22,45]);


    // real-time mod
    const [pointsMode, setPointsMode] = useState("default");
    const [realtime, setRealtime] = useState(false)

    const pointsDisplayMode = [
        { value: "default", label: "Default" },
        { value: "real-time", label: "Real time"},
    ]

    function handlePointsDisplayModeChange(selectedOption){
        setPointsMode(selectedOption.value);
        if(selectedOption.value == "default"){
            setRealtime(false);
        }else{
            setRealtime(true);
        }
        
    }



    //User interface
    //nastavenie spravnej vysky a sirky vykreslovacej plochy
    const [videoReady, setVideoReady] = useState(false);

    //ziskanie pozadovanej vysky a sirky vykreslovacej plochy
    useEffect(()=>{
        if(pageLoaded && videoReady){
            setStatusMessage("Setting canvas size")
            setCanvasSizeLoaded(false);
            var vd = document.querySelectorAll("video");

            var pointcloudView = document.getElementById("pointcloud-view");
            
            var pointcloudWidth = pointcloudView.offsetWidth;
            var pointcloudHeight = pointcloudView.offsetHeight;

            var scaleFactorX = pointcloudWidth / vd[0].videoWidth;
            var scaleFactorY = pointcloudHeight / vd[0].videoHeight;
            var scaleFactor = Math.min(scaleFactorX, scaleFactorY);

            setVisualisationWidth(Math.round(vd[0].videoWidth*scaleFactor));
            setVisualisationHeight(Math.round(vd[0].videoHeight * scaleFactor));
        }
    },[pageLoaded, videoReady])

    const [aspectRatio, setAspectRatio] = useState(null);

    //zmena rozmerov vykreslovacej plochy
    useEffect(()=>{
        if(visualisationHeight && visualisationWidth){
            var wString1 = "";
            var wString = wString1.concat(visualisationWidth, "px");
            var hString1 = "";
            var hString = hString1.concat(visualisationHeight, "px");

            //update camera aspect
            setAspectRatio(visualisationWidth / visualisationHeight);
            //update CSS properties
            var cWrapper = document.getElementById('canvas-wrapper');
            var vPlayer = document.getElementById('video-player');
            var bBackground = document.getElementById('bb-wrapper');
            cWrapper.style.width = wString;
            cWrapper.style.height = hString;
            vPlayer.style.width = wString;
            vPlayer.style.height = hString;
            bBackground.style.width = wString;
            bBackground.style.height = hString;

            //update vysky praveho panela
            var rPanel = document.getElementById('right-column');
            var wStringPanel1 = "";
            var wStringPanel = wStringPanel1.concat(window.innerHeight, "px");
            rPanel.style.height = wStringPanel;

            setCanvasSizeLoaded(true);
        }
    
    },[visualisationHeight,visualisationWidth])
    
    function videoReadyCallback(){
        setVideoReady(true)
    }

    //spravne zobrazovanie sekcie "Color Selection"
    useEffect(()=>{
        var solidColor = document.getElementById('solid-color');
        var colorScale = document.getElementById('color-scale');
        var colorModeSelector = document.getElementById('color-mode-selector')
        if(showSolidColor){
            solidColor.style.setProperty('z-index', 0);
            colorScale.style.setProperty('z-index', -1);
            colorModeSelector.style.setProperty('height', "430px")
        }else{
            solidColor.style.setProperty('z-index', -1);
            colorScale.style.setProperty('z-index', 0);
            colorModeSelector.style.setProperty('height', "257px")
        }
    }, [showSolidColor])

    //spravne vykreslovanie progress baru videa
    useEffect(()=>{
        if(pageLoaded){
            var sliderPP2 = document.getElementById('playing-progress');
            sliderPP2.addEventListener('input', updateValue);    
        }
    },[pageLoaded])

    function updateValue(){ 
        var sliderPP = document.getElementById('playing-progress');

        var valuePP = document.getElementById('played-progress-val');
        if(sliderPP != null){
            const val = sliderPP.value * 100;
            const valPercent = `${val}%`;
            const val2 = val - 2 * 1.03 - val * window.innerWidth * 0.0000030 + 0.49;   // - 30px

            const valPercent2 = `${val2}%`;
            sliderPP.style.setProperty('--valuePercent', valPercent);
            valuePP.style.setProperty('left', valPercent2);
        }
    }

    //spravne vykreslovanie posuvnika v sekcii "Filter Points"
    useEffect(()=>{
        // ziska 'left' attribute spodneho posuvnika
        var leftSlider = document.querySelector('.filter-slider .range-slider .range-slider__thumb[data-lower]');
        var leftOffset = leftSlider.offsetLeft;

        // zmeni width ::before elementu (seda oblast)
        var leftGreyWidthString = "";
        var leftGreyWidthString2 = leftGreyWidthString.concat(leftOffset, "px");
        leftSlider.style.setProperty('--greywidth', leftGreyWidthString2);

        // ziska 'left' attribute vrchneho posuvnika
        var rightSlider = document.querySelector('.filter-slider .range-slider .range-slider__thumb[data-upper]');
        var rightOffset = 330 - rightSlider.offsetLeft;

        // zmeni width ::before elementu (seda oblast)
        var rightGreyWidthString = "";
        var rightGreyWidthString2 = rightGreyWidthString.concat(rightOffset, "px");
        rightSlider.style.setProperty('--greywidthRight', rightGreyWidthString2);
    },[sliderValue])

    //status bar
    useEffect(()=>{
        if(pointsMode == "default"){
            if(canvasSizeLoaded && openCVLoadedStatus && distortionLoaded && rangeSliderLoaded && defaultPCDLoaded && settingHistogramLoaded && loadingIntensitiesLoaded && drawingNewPointsLoaded && cameraPositionsLoaded && cameraRotationsLoaded){
                setStatusReady(true);
                setStatusMessage("");
            }else{
                setStatusReady(false)
            }
        }else{
            if(canvasSizeLoaded && openCVLoadedStatus && distortionLoaded && rangeSliderLoaded && defaultPCDLoaded && settingHistogramLoaded && loadingIntensitiesLoaded && drawingNewPointsLoaded && realtimeFileArrayLoaded && realtimeTimestampsLoaded && realtimeInitialPointsLoaded && realtimeIntensitiesLoaded && cameraPositionsLoaded && cameraRotationsLoaded){
                setStatusReady(true);
                setStatusMessage("");
            }else{
                setStatusReady(false)
            }
        }
        
    },[canvasSizeLoaded, openCVLoadedStatus, distortionLoaded, rangeSliderLoaded, defaultPCDLoaded, settingHistogramLoaded, loadingIntensitiesLoaded, 
        drawingNewPointsLoaded,  realtimeFileArrayLoaded, realtimeTimestampsLoaded, realtimeInitialPointsLoaded, realtimeIntensitiesLoaded, cameraPositionsLoaded, cameraRotationsLoaded])
    

    // filter textfields
    function validateFilterTextfieldLeft(e){
        if(/^[0-9]*$/.test(e)){
            setSliderValue([e, sliderValue[1]]);
        }
    }

    function validateFilterTextfieldRight(e){
        if(/^[0-9]*$/.test(e)){
            setSliderValue([sliderValue[0], e]);
        }
    }

    return ( 
        <div className="fileloader">
            <Helmet>
            <script src="https://kit.fontawesome.com/1142118218.js" crossorigin="anonymous"></script>
            <link href='https://fonts.googleapis.com/css?family=Inter' rel='stylesheet'></link>
            </Helmet>


            <div className="column-primary">
                <div className="left-column">
                    <div className="pointcloud-view" id="pointcloud-view">
                        <div className="canvas-wrapper" id="canvas-wrapper">
                            <div className="bb-wrapper" id="bb-wrapper">
                                {overlayShown && <div className="black-background" id="black-background"></div>}
                            </div>
                            
                            <div className="video-player" id="video-player">
                                <ReactPlayer 
                                progressInterval ={ 10 }
                                url={videoFileString}
                                ref={playerRef}
                                playing={playing}
                                volume={volume}
                                onProgress={({ played }) => setPlayed(played)}
                                width={'100%'}
                                height={'100%'}
                                onDuration={(seconds) => {setDuration(seconds)}}
                                onReady={videoReadyCallback}
                                onError={videoErrorCallback}
                                />
                            </div>
                            <div className="distortion-canvas-wrapper" id="distortion-canvas-wrapper">
                                <canvas id="outputCanvas" width={0} height={0}></canvas>
                            </div>
                            
                            

                            <Canvas
                                camera={{
                                    position: [0.2, -1, 1],
                                    up: [0, 0, 1],
                                    near: 0.001,
                                    far: 100000,
                                    fov: 34.92,
                                    aspect: 1000 / 750
                                }}
                            >

                                {PCDfile && <PCDPointCloud file={PCDfile} color={PCDColor} setChartData={setChartData} setXIntensity={setMaxChartIntensity} setNIntensity={setMinChartIntensity} 
                                sliderValue={sliderValue} remapSliderValue={remapSliderValue} pointsMode={pointsMode} played={playedActual} setStatusMessage={setStatusMessage}
                                setDrawingNewPointsLoaded={setDrawingNewPointsLoaded} setLoadingIntensitiesLoaded={setLoadingIntensitiesLoaded} setSettingHistogramLoaded={setSettingHistogramLoaded}
                                setRealtimeFileArrayLoaded={setRealtimeFileArrayLoaded} setRealtimeTimestampsLoaded={setRealtimeTimestampsLoaded} setRealtimeInitialPointsLoaded={setRealtimeInitialPointsLoaded}
                                setRealtimeIntensitiesLoaded={setRealtimeIntensitiesLoaded} setErrorStatus={setErrorStatus} setErrorMessage={setErrorMessage}/>}

                                <MyCameraControls frame_no={frame_no} cameraPosition={cameraPosition} cameraRotation={cameraRotation} cameraOffset={cameraOffset} 
                                aspectRatio={aspectRatio} rotFile={rotFile} transFile={transFile} rotationOrder={rotationOrderString}
                                setCameraPositionsLoaded={setCameraPositionsLoaded} setCameraRotationsLoaded={setCameraRotationsLoaded} setStatusMessage={setStatusMessage}/>
                            </Canvas>
                        </div>   
                    </div>

                    <div className="video-controls">
                        <div className="video-controls-rows">

                            <div className="video-controls-row1">
                                <div className="video-progress-bar">
                                    <input
                                        id="playing-progress"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={played}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setPlayed(newValue);
                                            playerRef.current.seekTo(newValue);
                                        }}
                                    />
                                </div>
                                <div className="played-progress" id="played-progress-val-wrapper">
                                    <div id="played-progress-val">
                                        {playedActual}
                                    </div>
                                </div>
                            </div>

                            <div className="video-controls-row2">
                                <div className="video-background-button">
                                    <div className="background-button-wrapper">
                                        <button onClick={handleSwitchOverlay}>Change background</button>
                                    </div>
                                </div>

                                <div className="video-control-buttons">
                                    <div className="video-control-buttons-wrapper">
                                        <button onClick={seekBackward} className="backward-button">
                                            <div>⏪︎</div>
                                        </button>
                                        <button onClick={handlePlayPause} className="play-button">
                                            <div>
                                                {playing ? '⏸︎' : '⏵︎'}
                                            </div>
                                        </button>
                                        <button onClick={seekForward} className="forward-button">
                                            <div>⏩︎</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="video-volume-bar">
                                    <div className="volume-bar-wrapper">
                                        <div className="volume-bar-icon">
                                            <i class='fas fa-volume-up'></i>
                                        </div>
                                        <input
                                            id="volume"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                    </div>
                </div>

                <div className="right-column" id="right-column">

                    <div className="panel-caption">
                        <h1> Point Cloud video viewer <a href="https://github.com/" target="_blank"> <span className="info-icon-large"> <i class="fa-solid fa-circle-info"></i> </span> </a> </h1>
                    </div>

                    <div className="mode-select-controls">
                        <h4 className="grey-light-text">Mode <span className="info-icon-small"> <i class="fa-solid fa-circle-info"> 
                            <div className="mode-select-popup">
                                <span>Default - Points, camera positions and camera rotations are loaded from a file uploaded by the user. </span>
                                <span>Real time (Experimental) - Points, camera positions and camera rotations are streamed in real time from
                                    a remote server. This feature has not been fully implemented. </span>
                            </div>
                        </i> </span></h4>
                        <div className="select-container">
                        <Select options={pointsDisplayMode} onChange={handlePointsDisplayModeChange} defaultValue={pointsDisplayMode[0]} styles={{
                            control: (baseStyles, state) => ({
                            ...baseStyles,
                            textAlign: 'left',
                            paddingLeft: '3px',
                            fontFamily: 'Inter',
                            fontSize: '15px',
                            borderRadius: '8px'
                            }),
                            menu: (baseStyles, state) => ({
                            ...baseStyles,
                            marginTop: '0px',
                            paddingTop: '0px',
                            textAlign: 'left',
                            paddingLeft: '3px',
                            fontFamily: 'Inter',
                            fontSize: '15px',
                            }),
                        }}/>
                        </div>
                    </div>

                    <div className="upload-button">
                        <button onClick={handleUploadButton}> Upload files </button>
                    </div>

                    <div className="fps-info">
                        <div>
                            <h4 className="grey-light-text"> Animation FPS </h4>
                            <input type="textfield" value={FPSTemp} onChange={(e) => validateFPSTemp(e.target.value)}></input>
                            <button onClick={updateFPS}> Update FPS </button>
                        </div>
                        
                        <div className="current-frame">Current Frame: {frame_no}</div>
                        <div className="current-fps">Current FPS: {animationFPS}</div>
                    </div>

                    <div className="adjust-camera-controls">
                        <h3 className="panel-section-caption">Adjust camera <span className="info-icon-medium"> <i class="fa-solid fa-circle-info">
                            <div className="camera-controls-popup">
                                <span>Adjust postition, rotation and offset of the camera in each frame. All adjustments are applied every frame after the camera has been moved and rotated according to
                                    the files uploaded by user. </span>
                                    <span> Camera position: Adjust position of the virtual camera. </span>
                                    <span> Camera rotation: Adjust rotation of the virtual camera. Values are in radians and rotations are applied in YXZ order. </span>
                                <span> Camera offset: Move all displayed points up/down or left/right on the screen. </span>
                            </div>    
                        </i> </span></h3>
                        <h4 className="grey-light-text">Camera position</h4>
                        <div className="camera-adjustment-inputrow">
                            <div className="adjustment-value">
                                <label>X: </label>
                                <input type="number" step={0.05} value={cameraPosition[0]} onChange={(e) => setCameraPosition([Number(e.target.value),cameraPosition[1],cameraPosition[2]])}></input>
                            </div>
                            <div className="adjustment-value">
                                <label>Y: </label>
                                <input type="number" step={0.05} value={cameraPosition[1]} onChange={(e) => setCameraPosition([cameraPosition[0],Number(e.target.value),cameraPosition[2]])}></input>
                            </div>
                            <div className="adjustment-value">
                                <label>Z: </label>
                                <input type="number" step={0.05} value={cameraPosition[2]} onChange={(e) => setCameraPosition([cameraPosition[0],cameraPosition[1],Number(e.target.value)])}></input>
                            </div>
                        </div>
                        
                        <h4 className="grey-light-text top-margin-inputrow" >Camera rotation (rad, YXZ)</h4>
                        <div className="camera-adjustment-inputrow">
                            <div className="adjustment-value">
                                <label>X: </label>
                                <input type="number" step={0.003} value={cameraRotation[0]} onChange={(e) => setCameraRotation([Number(e.target.value),cameraRotation[1],cameraRotation[2]])}></input>
                            </div>
                            <div className="adjustment-value">
                                <label>Y: </label>
                                <input type="number" step={0.003} value={cameraRotation[1]} onChange={(e) => setCameraRotation([cameraRotation[0],Number(e.target.value),cameraRotation[2]])}></input>
                            </div>
                            <div className="adjustment-value">
                                <label>Z: </label>
                                <input type="number" step={0.003} value={cameraRotation[2]} onChange={(e) => setCameraRotation([cameraRotation[0],cameraRotation[1],Number(e.target.value)])}></input>
                            </div>
                        </div>

                        <h4 className="grey-light-text top-margin-inputrow">Camera offset</h4>
                        <div className="camera-adjustment-inputrow">
                            <div className="adjustment-value">
                                <label>X: </label>
                                <input type="number" value={cameraOffset[0]} onChange={(e) => setCameraOffset([Number(e.target.value),cameraOffset[1]])}></input>
                            </div>
                            <div className="adjustment-value">
                                <label>Y: </label>
                                <input type="number" value={cameraOffset[1]} onChange={(e) => setCameraOffset([cameraOffset[0],Number(e.target.value)])}></input>
                            </div>
                        </div>
                    </div>

                    <div className="color-selection">
                        <h3 className="panel-section-caption">Color selection <span className="info-icon-medium"> <i class="fa-solid fa-circle-info">
                            <div className="color-selection-popup">
                                <span> Change the color of each point. Intensities can be used to determine the final color. </span>
                                <span> Solid Color: Set the color of each point to a single color. Optionally intensities can be used to influence the strength of the color. </span>
                                <span> Color scale: Each point gets its color from a linear color scale, which can be modified. Intensity determines where on the color scale
                                    will each point lie (left side of the color scale corresponds to lower intensities) </span>
                            </div>
                            </i> </span></h3>

                        <h4 className="grey-light-text ">Color mode: </h4>
                        <div className="select-container">
                        <Select options={colorModeOptions} onChange={handleColorModeChange} defaultValue={colorModeOptions[0]} styles={{
                            control: (baseStyles, state) => ({
                            ...baseStyles,
                            textAlign: 'left',
                            paddingLeft: '3px',
                            fontFamily: 'Inter',
                            fontSize: '15px',
                            borderRadius: '8px'
                            }),
                            menu: (baseStyles, state) => ({
                            ...baseStyles,
                            marginTop: '0px',
                            paddingTop: '0px',
                            textAlign: 'left',
                            paddingLeft: '3px',
                            fontFamily: 'Inter',
                            fontSize: '15px',
                            }),
                        }}/>
                        </div>
                        
                        <div className="color-mode-selector" id="color-mode-selector">

                            <div className="solid-color" id="solid-color">
                                <SketchPicker 
                                    color={ color }
                                    onChangeComplete={ handleColorChangeSolid }
                                    onChange={ handleColorChangeSolid }
                                    width={ '280px' }
                                />
                                <div className="solid-use-intensities">
                                    <label htmlFor="use-intensities">Use intensities</label>
                                    <input id="use-intensities" checked={useIntensities} type="checkbox" value={useIntensities} onChange={handleColorChangeIntensities}></input>
                                </div>
                            </div>

                            <div className="color-scale" id="color-scale">
                                <h4 className="grey-light-text">Colors / Steps</h4>
                                <div className="color-scale-number">
                                    <input type="number"  value={colorScaleStepsInput} onChange={(e) => handleColorScaleStepsChange(e.target.value)}></input>
                                </div>
                                <div className="color-scale-select">
                                    <Select options={selectOptions} onChange={handleSelectChange} defaultValue={selectOptions[0]} styles={{
                                        control: (baseStyles, state) => ({
                                        ...baseStyles,
                                        textAlign: 'left',
                                        paddingLeft: '3px',
                                        fontFamily: 'Inter',
                                        fontSize: '15px',
                                        borderRadius: '8px'
                                        }),
                                        menu: (baseStyles, state) => ({
                                        ...baseStyles,
                                        marginTop: '0px',
                                        paddingTop: '0px',
                                        textAlign: 'left',
                                        paddingLeft: '3px',
                                        fontFamily: 'Inter',
                                        fontSize: '15px',
                                        zIndex: '1000',
                                        }),
                                    }}/>
                                </div>
                                <div className="colorScaleWrapper">
                                    <div className="range-slider-overlay">
                                        <RangeSlider id="range-slider-scale" max={310} min={0} step={1} rangeSlideDisabled={true} value={scaleSliderValue} onInput={setScaleSliderValue}/>
                                    </div>
                                    <canvas id="myCanvas" width="310px" height="35px" ></canvas>
                                </div>
                                <div className="color-scale-opacity">
                                    <h4 className="grey-light-text">Opacity</h4>
                                    <div className="opacity-slider-wrapper">
                                        <input
                                            id="color-scale-opacity-slider"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={colorScaleOpacity}
                                            onChange={(e) => handleColorScaleOpacity(parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    <div className="filter-points">
                        <h3 className="panel-section-caption">Filter points <span className="info-icon-medium"> <i class="fa-solid fa-circle-info">
                            <div className="filter-popup">
                                <span> Select which points are shown based on their intensity. Use the slider to control the lowest and highest intensity value for any given point
                                    to make the point visible. </span>
                                <span> In solid color mode with intensities used, color of each point can also be modified by remapping the intensity boundaries to make the point have lowest color strength,
                                    highest color strength or color strength selected from a linear range between these 2 values. </span>
                            </div>
                        </i> </span></h3> 
                        <h4 className="grey-light-text">Filter points by intensity</h4>

                        <div className="histogram-wrapper">
                            {chartData && <Bar options={chartOptions} data={chartData} />}
                        </div>
                        <div className="filter-slider">
                            <RangeSlider max={maxChartIntensity} min={minChartIntensity} step={1} value={sliderValue} onInput={setSliderValue}/>
                        </div>
                        {sliderValue && 
                        <div className="filter-description">
                            <div className="filter-description-caption">
                                 <span> Showing points where </span> 
                            </div>
                            <div className="filter-description-value">
                                <input type="textfield" id="filter-slider-text-left" value={sliderValue[0]} onChange={(e) => validateFilterTextfieldLeft(e.target.value)}></input> {"≤"} Intensity {"≤"} <input type="textfield" id="filter-slider-text-right" value={sliderValue[1]} onChange={(e) => validateFilterTextfieldRight(e.target.value)}></input>
                            </div>
                        </div>
                        }

                        <h4 className="grey-light-text">Color intensity remap</h4>
                        <div className="remap-slider">
                            <RangeSlider max={maxChartIntensity} min={minChartIntensity} step={1} value={remapSliderValue} onInput={setRemapSliderValue} disabled={showColorScale || !useIntensities}/>
                        </div>
                        <div className="remap-slider-description">
                            <span> Minimal intensity: {minChartIntensity} - {remapSliderValue && remapSliderValue[0]} </span>
                            <span> Linear distribution of intensity: {remapSliderValue && remapSliderValue[0]} - {remapSliderValue && remapSliderValue[1]} </span>
                            <span> Maximum intensity: {remapSliderValue && remapSliderValue[1]} - {maxChartIntensity} </span>
                        </div>
                    </div>

                    <div className="experimental-features">
                        <h3 className="panel-section-caption">Experimental features <span className="info-icon-medium"> <i class="fa-solid fa-circle-info">
                            <div className="experimental-popup">
                                <span> Features not yet fully implemented or implemented as an experiment. Using these features may make the application unstable. </span>
                                <span> Use distortion: Removes camera lens distortion from the background video. Currently only supported for the default video. </span>
                            </div>
                        </i> </span></h3> 
                        <div className="distortion-controls">
                            <label htmlFor="use-distortion">Use distortion</label>
                            <input id="use-distortion" checked={useDistortion} type="checkbox" value={useDistortion} onChange={handleUseDistortionChange}></input>
                        </div>
                    </div>
                </div>
            </div>

            <div className="distortion">
                <canvas id="capture-canvas"></canvas>
            </div>

            {showUploadScreen && 
            <div className="upload-screen">
                <div className="upload-row1">
                    <div className="upload-caption">
                        <span>Upload Files</span>
                    </div>
                    <div className="upload-close">
                        <button onClick={handleUploadButton}>✖</button>
                    </div>
                </div>
                <div className="upload-row2">
                    <div className="upload-block">
                        <h4 className="grey-light-text2">Camera positions (.csv)</h4>
                        <div className="upload-input-wrapper" id="trans-upload">
                            <label for="file-upload-trans" class="custom-file-upload">
                                Browse...
                            </label>
                            <input id="file-upload-trans" type="file" onChange={(e)=>setTransFileTemp(e.target.files[0])} accept=".csv,"/>
                            <div className="file-uploaded">
                                {transFileTemp ? transFileTemp.name : "No file selected" }
                            </div>
                        </div>
                    </div>

                    <div className="upload-block">
                        <h4 className="grey-light-text2">Camera rotations (.csv)</h4>
                        <div className="upload-input-wrapper" id="rot-upload">
                            <label for="file-upload-rot" class="custom-file-upload">
                                Browse...
                            </label>
                            <input id="file-upload-rot" type="file" onChange={(e)=>setRotFileTemp(e.target.files[0])} accept=".csv,"/>
                            <div className="file-uploaded">
                                {rotFileTemp ? rotFileTemp.name : "No file selected" }
                            </div>
                        </div>
                    </div>

                    <div className="upload-block">
                        <h4 className="grey-light-text2">PointCloud file (.pcd)</h4>
                        <div className="upload-input-wrapper" id="pcd-upload">
                            <label for="file-upload-pcd" class="custom-file-upload">
                                Browse...
                            </label>
                            <input id="file-upload-pcd" type="file" onChange={(e)=>setPcdFileTemp(e.target.files[0])} accept=".pcd,"/>
                            <div className="file-uploaded">
                                {pcdFileTemp ? pcdFileTemp.name : "No file selected" }
                            </div>
                        </div>
                    </div>
                </div>
                <div className="upload-row3">
                        <div className="video-file">
                            <h4 className="grey-light-text2 upload-subcaption">Video File</h4>
                            <div className="upload-video-input" id="video-upload">
                                <input 
                                    type="text" 
                                    value={videoFileStringTemp}
                                    onChange={(e)=>setVideoFileStringTemp(e.target.value)}
                                    placeholder="Link to video file">
                                </input>
                            </div>
                        </div>
                        <div className="upload-parameters">
                            <h4 className="grey-light-text2">Rotation order</h4>
                            <div className="input-parameters-input" id="input-parameters">
                                <input 
                                    type="text" 
                                    value={rotationOrderStringTemp}
                                    onChange={(e)=>restrictRotationOrderString(e.target.value)}
                                    placeholder="YZX">
                                </input>
                            </div>
                        </div>
                    </div>
                <div className="upload-row4">
                    <div className="upload-optional-caption">
                        <span> Optional uploads (Experimental) </span>
                    </div>
                    <div className="upload-row4-files">
                        <div className="upload-block">
                            <h4 className="grey-light-text2">Distortion coefficients (.csv)</h4>
                            <div className="upload-input-wrapper">
                                <label for="file-upload-dist" class="custom-file-upload upload-disabled">
                                    Browse...
                                </label>
                                <input id="file-upload-dist" type="file" disabled={true}/>
                                <div className="file-uploaded">
                                    No file selected.
                                </div>
                            </div>
                        </div>

                        <div className="upload-block">
                            <h4 className="grey-light-text2">Camera matrix (.csv)</h4>
                            <div className="upload-input-wrapper">
                                <label for="file-upload-mat" class="custom-file-upload upload-disabled">
                                    Browse...
                                </label>
                                <input id="file-upload-mat" type="file" disabled={true}/>
                                <div className="file-uploaded">
                                    No file selected.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="upload-row5">
                    <div className="upload-file-format">
                        <span> <a href="https://github.com/" target="_blank">File format specification</a></span>
                        <span> {uploadScreenMessage} </span>
                    </div>
                    <div className="upload-cancel-button">
                        <button onClick={handleUploadButton}> Cancel </button>
                    </div>
                    <div className="upload-upload-button">
                        <button onClick={handleUploadFiles}> Upload </button>
                    </div>
                </div>
            </div> 
            }

            <div className="status-bar">
                {!errorStatus && statusReady && <span className="status-ready">Ready</span>}
                {!errorStatus && !statusReady && <span className="status">Loading</span>}
                {!errorStatus && !statusReady && <span className="status-message">{statusMessage}</span>}
                {errorStatus && <span className="error-status">Error</span>}
                {errorStatus && <span className="error-message">{errorMessage}</span>}
            </div>

        </div>
     );
}
 
export default FileLoader;