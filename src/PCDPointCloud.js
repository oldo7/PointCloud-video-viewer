// Autor: Oliver Nemček
// Komponent ovládania 3D bodov

import { useEffect, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import useLoader from "./hooks/useLoader";
import { PCDLoader } from "@loaders.gl/pcd";
import {PCDLoader as PCDLoader2} from 'three/addons/loaders/PCDLoader.js';
import { load } from "@loaders.gl/core";


const PCDPointCloud = (props) => {
    //uzivatelom nahraty / vychodiskovy PCD subor
    var file = props.file;

    //aktualne zvolena farba
    var color = props.color;

    //histogram
    var setChartData = props.setChartData;
    var setXIntensity = props.setXIntensity;
    var setNIntensity = props.setNIntensity;

    //UI prvky
    var sliderValue = props.sliderValue;
    var remapSliderValue = props.remapSliderValue;

    //mod zobrazenia bodov (Default / Real time)
    var pointsMode = props.pointsMode;

    //props pre real time mod
    var played = props.played;
    
    //status bar - status nacitania jednotlivych elementov / suborov
    var setStatusMessage = props.setStatusMessage;
    var setErrorMessage = props.setErrorMessage;
    var setErrorStatus = props.setErrorStatus;
    var setDrawingNewPointsLoaded = props.setDrawingNewPointsLoaded;
    var setLoadingIntensitiesLoaded = props.setLoadingIntensitiesLoaded;
    var setSettingHistogramLoaded = props.setSettingHistogramLoaded;

    var setRealtimeFileArrayLoaded = props.setRealtimeFileArrayLoaded;
    var setRealtimeTimestampsLoaded = props.setRealtimeTimestampsLoaded;
    var setRealtimeInitialPointsLoaded = props.setRealtimeInitialPointsLoaded;
    var setRealtimeIntensitiesLoaded = props.setRealtimeIntensitiesLoaded;
    

    const { scene } = useThree();       //useThree = vrati informacie o scene
    const [points, setPoints] = useState();                         //drzi body aktualne zobrazene na scene
    const [intensities, setIntensities] = useState(null);           //drzi intenzity k bodom aktualne na scene
    const [maxIntensity, setMaxIntensity] = useState(0);
    const [minIntensity, setMinIntensity] = useState(0);
    const [originalPoints, setOriginalPoints] = useState();                     //drzi vsetky originalne nezmenene body. zmeni sa iba raz a to pri nastavovani prvy krat
    const [originalIntensities, setOriginalIntensities] = useState();         //drzi vsetky originalne nezmenene intenzity. zmeni sa iba raz a to pri nastavovani prvy krat
    const [updateColor, setUpdateColor] = useState(false);                    //nutnost znovu vypocitat a aplikovat farbu bodov
    const [maxFiles, setMaxFiles] = useState(590);                            //maximalny pocet suborov v real-time mode

    //ziskanie dat z dodaneho suboru
    const { data, err, isLoading } = useLoader(file, PCDLoader);
    
    useEffect(()=>{
        if(err){
            setErrorStatus(true);
            setErrorMessage("Invalid PCD file");
            setTimeout(() => {
                setErrorStatus(false);
                setErrorMessage("");
            }, 4000);
        }
    },[err])


    //vykreslenie bodov po spracovani suboru
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [updatePoints, setUpdatePoints] = useState(false);
    
    useEffect(() => {
        if (!isLoading && data && intensities && !initialLoaded) {
            setStatusMessage("Drawing new points");
            setDrawingNewPointsLoaded(false);

            const geometry = new THREE.BufferGeometry();
            const positions = data.attributes.POSITION.value;
            
            //vytvorenie pola farieb
            const colors = [];

            // vychodiskova farba bodov: biela s pouzitim intenzit (greyscale)
            for ( let i = 0; i < intensities.length; i ++ ) {
                colors.push(intensities[i] / maxIntensity, intensities[i] / maxIntensity, intensities[i] / maxIntensity)
            }

            geometry.setAttribute( 
                'color', 
                new THREE.Float32BufferAttribute( colors, 3 ) 
            );

            geometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(positions, 3)          //vytvori pole kde kazde tri hodnoty su asociovane s jednym vertexom. pouziva sa ako atribut position pre THREE.Buffergeometry
            );
      
            const material = new THREE.PointsMaterial({
              size: 0.005,
              vertexColors: true,
            });
            const points = new THREE.Points(geometry, material);
      
            setOriginalPoints(positions);
            setPoints(points);
            setInitialLoaded(true);
          }
      }, [data, isLoading, originalIntensities, updatePoints]);
    
        
      useEffect(()=>{
        if(!initialLoaded){
            setUpdatePoints(!updatePoints);
        }
      },[initialLoaded]);

      //pridanie bodov na scenu
      useEffect(() => {
        if (points) {
          scene.add(points);
          setDrawingNewPointsLoaded(true);
          return () => {
            // Cleanup
            scene.remove(points);
            points.geometry.dispose();
            points.material.dispose();
          };
        }
      }, [points, scene]);


    //ziskanie intenzit
    const [updateIntensities, setUpdateIntensities] = useState(false);
    
    
    useEffect(() => {
        if(pointsMode == "default" && !isLoading && data){
            
            setStatusMessage("Loading Intensities");
            setLoadingIntensitiesLoaded(false);

            const loader = new PCDLoader2(); 
            var fr = new FileReader();  
            fr.readAsArrayBuffer(file)

            fr.addEventListener('loadend', function() {
                var intensities = loader.parse(fr.result).geometry.attributes.intensity.array
                var minIntensity = intensities[0];
                var maxIntensity = intensities[0];
                for(var i = 0; i < intensities.length; i++){
                    //vypocitanie maxima a minima - math.max sa neda pouzit kvoli limitu stacku v chrome browseroch
                    if(intensities[i] < minIntensity){
                    minIntensity = intensities[i];
                    }
                    if(intensities[i] > maxIntensity){
                    maxIntensity = intensities[i]
                    }
                }
                setMaxIntensity(maxIntensity);
                setMinIntensity(minIntensity);
                setOriginalIntensities(intensities);
                setIntensities(intensities);
                
                setLoadingIntensitiesLoaded(true);
                

            });

            setInitialLoaded(false);
        }
    }, [data, updateIntensities])
    

    //zmena farby / linearneho premapovania intenzit na farbu
    useEffect(() => {
        if(points){
            if(color[0] == "solid" || color[0] == "intensities"){
                var rComponent = color[1].r / 255;
                var gComponent = color[1].g / 255;
                var bComponent = color[1].b / 255;
            }
            
            const colors = [];

            if(color[0] == "solid"){
                for ( let i = 0; i < points.geometry.attributes.position.array.length / 3; i ++ ) {
                    colors.push( rComponent, gComponent, bComponent);
                }
            }else if(color[0] == "intensities"){
                var currentMax = remapSliderValue[1];
                var currentMin = remapSliderValue[0];

                var diff = 0.9 / (currentMax + 0.0001 - currentMin);
                for ( let i = 0; i < points.geometry.attributes.position.array.length / 3; i ++ ) {
                    if(true){
                        var currentIntensity = Math.min(Math.max(((intensities[i] - currentMin) * diff) + 0.1, (0.1)),1);
                    }
                    colors.push( (currentIntensity * rComponent),
                                (currentIntensity * gComponent),
                                (currentIntensity * bComponent) );
                }
            }else if(color[0] == "scale"){
                var scaleSliderLower = color[3][0];
                var scaleSliderUpper = color[3][1];

                var intStep = (scaleSliderUpper - scaleSliderLower) / (color[1].length); // -1?

                for ( let i = 0; i < points.geometry.attributes.position.array.length / 3; i ++ ) {
                    var remappedIntensity = intensities[i] * (310 / maxIntensity);          // remapuje intenzitu na range 0-310
                    // intenzita pod/nad spodnym thresholdom
                    if(remappedIntensity <= scaleSliderLower){
                        var colorArrayIndex = 0;
                    }else if(remappedIntensity >= scaleSliderUpper){
                        var colorArrayIndex = color[1].length-1;
                    }
                    //intenzita medzi slidermi
                    else{
                        var colorArrayIndex = Math.floor((remappedIntensity - scaleSliderLower) / intStep)
                    }


                    colors.push( color[1][colorArrayIndex].r, color[1][colorArrayIndex].g, color[1][colorArrayIndex].b);
                }
                if(points.material.opacity != color[2]){
                    const newmaterial = new THREE.PointsMaterial({
                        size: 0.005,
                        vertexColors: true,
                        transparent: true,
                        opacity: color[2],
                    });
                    points.material = newmaterial;
                }
            }

            points.geometry.setAttribute(
                'color', 
                new THREE.Float32BufferAttribute( colors, 3 ) 
            )

            setOldColors(colors);

            //zmena alphy
            if((color[0] == "solid" || color[0] == "intensities") && points.material.opacity != color[1].a){
                const newmaterial = new THREE.PointsMaterial({
                    size: 0.005,
                    vertexColors: true,
                    transparent: true,
                    opacity: color[1].a,
                });
                points.material = newmaterial;
            }
        }
    }, [color, updateColor, remapSliderValue]);


    //zmena slideru zobrazenych bodov podla intenzit (filter)
    useEffect(() => {
        if(points){
            var newGeometry = [];
            var newIntensities = [];
            for(var i = 0; i < originalIntensities.length; i++){
                if(originalIntensities[i] >= sliderValue[0] && originalIntensities[i] <= sliderValue[1]){
                    newGeometry.push(originalPoints[i*3], originalPoints[i*3+1], originalPoints[i*3+2])
                    newIntensities.push(originalIntensities[i]);
                }
            }

            setIntensities(newIntensities);


            points.geometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(newGeometry, 3)          //vytvori pole kde kazde tri hodnoty su asociovane s jednym vertexom. pouziva sa ako atribut position pre THREE.Buffergeometry
            );

            setOldPositions(newGeometry);
            setUpdateColor(!updateColor);                           //kedze sa zmenili farby bodov, je nutne prepocitat farby aby sedeli indexy bodov s ich intenzitami
        }
    }, [sliderValue])


    //histogram
    useEffect(() => {
        if(originalIntensities){
            
            setSettingHistogramLoaded(false);
            setStatusMessage("Loading histogram");
            
            var labels = []
            for(var i = minIntensity; i <= maxIntensity; i++){
                labels.push(i)
            }
            var intensitiesCount = []
            for(var i = minIntensity; i <= maxIntensity; i++){
                intensitiesCount.push(0);
            }
            for(var i = 0; i < originalIntensities.length; i++){
                intensitiesCount[originalIntensities[i]]++;
            }
            setChartData(
                {
                    labels,
                    datasets: [
                      {
                        label: 'sda',
                        data: intensitiesCount,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                      },
                    ],
                }
            )

            //minimalna a maximalna intenzita pre chart a slider
            setXIntensity(maxIntensity);
            setNIntensity(minIntensity);

            setSettingHistogramLoaded(true);
        }
    }, [originalIntensities, maxIntensity])



    //real-time mod
    const [dataArray, setDataArray] = useState([]);
    const [dataArrayLoaded, setDataArrayLoaded] = useState(false);
    const [fileArray, setFileArray] = useState([]);
    const [fileArrayLoaded, setFileArrayLoaded] = useState(false);
    const [intensitiesArray, setIntensitiesArray] = useState([])
    const [intensitiesArrayLoaded, setIntensitiesArrayLoaded] = useState(false);

    //ziska file array
    function loadIntoFileArray(iteration){
        
        setStatusMessage("Loading real-time array");
        setRealtimeFileArrayLoaded(false);
        

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "./pcd/pcd_files/pcd_".concat(iteration,".pcd"), true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            var pointCloudFile = new File([xhr.response], "pcd_".concat(iteration,".pcd"))
            setFileArray(fileArray => [...fileArray, pointCloudFile]);
            if(iteration < maxFiles){
                loadIntoFileArray(iteration + 1);
            }else{
                setFileArrayLoaded(true)
                
            }
        };
        xhr.send(); 
    }

    //konverzia fileArray->dataArray
    useEffect(()=>{
        if(fileArrayLoaded){
            //useLoader ekvivalent
            loadIntoDataArray(0);
            loadIntensities(0);
        }
    },[fileArrayLoaded])

    function loadIntoDataArray(iteration){
        try {
            load(fileArray[iteration], PCDLoader).then((result) => {
                setDataArray(dataArray => [...dataArray, result]);
                if(iteration < maxFiles){
                    loadIntoDataArray(iteration + 1);
                }else{
                    setDataArrayLoaded(true);

                    setRealtimeFileArrayLoaded(true);
                }
            });
          } catch (err) {
                console.log("ERROR PARSING PCD FILES: ", err);
          }
    }

    // nacitanie timestampov
    const [timestamps, setTimestamps] = useState(null);

    function loadTimestamps(){
        setStatusMessage("Loading real-time timestamps");
        setRealtimeTimestampsLoaded(false);
        
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "./other/pcl_timestamps.txt", false);
        xmlhttp.send();
        if (xmlhttp.status==200) {
            var rotresult = xmlhttp.responseText;
            setTimestamps(rotresult.split('\n').map(line => line.split(' ')))
            
            setRealtimeTimestampsLoaded(true);
        }
        else{
            console.log("error fetching PCL timestamps")
        }
    }

    //Vykreslenie bodov v real-time mode
    //pomocna funkcia pre vykreslenie bodov v real-time mode
    function concatenate_arrs(resultConstructor, ...arrays) {
        let totalLength = 0;
        for (let arr of arrays) {
            totalLength += arr.length;
        }
        let result = new resultConstructor(totalLength);
        let offset = 0;
        for (let arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    //timestampIndex = index posledneho timestampu ktory bol vykresleny v poli timestamps
    const [timestampIndex, setTimestampIndex] = useState(0);

    //po nacitani dat zo suborov a timestampov vykresli body ktore maju byt v dany cas zobrazene a aktualizuje premennu intensities
    useEffect(()=>{
        if(dataArrayLoaded && timestamps && intensitiesArrayLoaded){
            setStatusMessage("Loading initial real-time points");
            setRealtimeInitialPointsLoaded(false);

            var positions2 = new Float32Array([]);
            var j = 0;

            var currentIntensitiesArray = new Float32Array([]);
            while(played > timestamps[j][1]){
                positions2 = concatenate_arrs(Float32Array, positions2, dataArray[j].attributes.POSITION.value)
                currentIntensitiesArray = concatenate_arrs(Float32Array, currentIntensitiesArray, intensitiesArray[j])
                j++;
            }

            const geometry = new THREE.BufferGeometry();

            if(color[0] == "solid" || color[0] == "intensities"){
                var rComponent = color[1].r / 255;
                var gComponent = color[1].g / 255;
                var bComponent = color[1].b / 255;
            }
            
            const colors = [];

            if(color[0] == "solid"){
                for ( let i = 0; i < positions2.length / 3; i ++ ) {
                    colors.push( rComponent, gComponent, bComponent);
                }
            }else if(color[0] == "intensities"){
                var currentMax = remapSliderValue[1];
                var currentMin = remapSliderValue[0];

                var diff = 0.9 / (currentMax + 0.0001 - currentMin);
                for ( let i = 0; i < positions2.length / 3; i ++ ) {
                    if(true){
                        var currentIntensity = Math.min(Math.max(((currentIntensitiesArray[i] - currentMin) * diff) + 0.1, (0.1)),1);
                    }
                    colors.push( (currentIntensity * rComponent),
                                (currentIntensity * gComponent),
                                (currentIntensity * bComponent) );
                }
            }else if(color[0] == "scale"){
                var scaleSliderLower = color[3][0];
                var scaleSliderUpper = color[3][1];

                var intStep = (scaleSliderUpper - scaleSliderLower) / (color[1].length); // -1?
                

                for ( let i = 0; i < positions2.length / 3; i ++ ) {
                    var remappedIntensity = currentIntensitiesArray[i] * (310 / maxIntensity);          // remapuje intenzitu na range 0-310
                    // intenzita pod/nad spodnym thresholdom
                    if(remappedIntensity <= scaleSliderLower){
                        var colorArrayIndex = 0;
                    }else if(remappedIntensity >= scaleSliderUpper){
                        var colorArrayIndex = color[1].length-1;
                    }
                    //intenzita medzi slidermi
                    else{
                        var colorArrayIndex = Math.floor((remappedIntensity - scaleSliderLower) / intStep)
                    }

                    colors.push( color[1][colorArrayIndex].r, color[1][colorArrayIndex].g, color[1][colorArrayIndex].b);
                }
                
            }

            geometry.setAttribute( 
                'color', 
                new THREE.Float32BufferAttribute( colors, 3 ) 
            );

            geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions2, 3)          //vytvori pole kde kazde tri hodnoty su asociovane s jednym vertexom. pouziva sa ako atribut position pre THREE.Buffergeometry
            );
            
            var material = new THREE.PointsMaterial({
                size: 0.005,
                vertexColors: true,
            });

            if(color[0] == "scale"){
                material = new THREE.PointsMaterial({
                    size: 0.005,
                    vertexColors: true,
                    transparent: true,
                    opacity: color[2],
                });
            }
            const points = new THREE.Points(geometry, material);
            
            // do points array sa pridaju biele body aktualneho suboru
            setOldColors(colors);
            setOriginalPoints(positions2);
            setOldPositions(positions2);
            setPoints(points);

            //update intensities
            setOriginalIntensities(currentIntensitiesArray);
            setIntensities(currentIntensitiesArray);

            //update timestamp index
            //timestamp index musi v tomto bode byt 0
            var tempIndex = timestampIndex
            while(played > timestamps[tempIndex + 1][1]){
                tempIndex++;
            }
            setTimestampIndex(tempIndex);
            
            setRealtimeInitialPointsLoaded(true);
        }
    },[dataArrayLoaded, timestamps, intensitiesArrayLoaded])
    
    const [oldColors, setOldColors] = useState(null);
    const [oldPositions, setOldPositions] = useState([]);
    
    // updatovanie zobrazenych bodov v real-time mode pri prehravani videa
    useEffect(()=>{
        if(pointsMode == "real-time" && dataArrayLoaded && timestamps){
            if(played > timestamps[timestampIndex + 1][1] && timestampIndex + 1 < maxFiles){
                var positions2 = oldPositions;
                var j = timestampIndex + 1;
                var currentIntensitiesArray = intensities;

                var filteredPositions = [];
                var filteredIntensities = [];

                var originalIntensitiesArray = originalIntensities;
                var originalPointsArray = originalPoints;

                while(played > timestamps[j][1]){
                    //aktualne zobrazene body: ihned aplikuje filter
                    for(var ii = 0; ii < intensitiesArray[j].length; ii++){
                        if(intensitiesArray[j][ii] >= sliderValue[0] && intensitiesArray[j][ii] <= sliderValue[1]){
                            filteredPositions.push(dataArray[j].attributes.POSITION.value[ii*3], dataArray[j].attributes.POSITION.value[ii*3+1], dataArray[j].attributes.POSITION.value[ii*3+2]);
                            filteredIntensities.push(intensitiesArray[j][ii]);
                        }
                    }

                    positions2 = concatenate_arrs(Float32Array, positions2, filteredPositions);
                    currentIntensitiesArray = concatenate_arrs(Float32Array, currentIntensitiesArray, filteredIntensities);

                    originalPointsArray = concatenate_arrs(Float32Array, originalPointsArray, dataArray[j].attributes.POSITION.value);
                    originalIntensitiesArray = concatenate_arrs(Float32Array, originalIntensitiesArray, intensitiesArray[j]);
                    j++;
                }
                    

                setTimestampIndex(j);

                const geometry = new THREE.BufferGeometry();
                
                //nastavenie farieb novych bodov
                var colors = [];

                if(oldColors){
                    colors = oldColors;
                }

                //nastavi inicialnu farbu bodov na PDCcolor
                if(color[0] == "solid" || color[0] == "intensities"){
                    var rComponent = color[1].r / 255;
                    var gComponent = color[1].g / 255;
                    var bComponent = color[1].b / 255;
                }

                if(color[0] == "solid"){
                    for ( let i = 0; i < (positions2.length - oldPositions.length) / 3; i ++ ) {
                        colors.push( rComponent, gComponent, bComponent);
                    }
                }else if(color[0] == "intensities"){
                    var currentMax = remapSliderValue[1];
                    var currentMin = remapSliderValue[0];

                    var diff = 0.9 / (currentMax + 0.0001 - currentMin);
                    for ( let i = 0; i < (positions2.length - oldPositions.length) / 3; i ++ ) {
                        if(true){
                            var currentIntensity = Math.min(Math.max(((currentIntensitiesArray[i + oldPositions.length / 3] - currentMin) * diff) + 0.1, (0.1)),1);
                        }
                        colors.push( (currentIntensity * rComponent),
                                    (currentIntensity * gComponent),
                                    (currentIntensity * bComponent) );
                    }
                }else if(color[0] == "scale"){
                    var scaleSliderLower = color[3][0];
                    var scaleSliderUpper = color[3][1];

                    var intStep = (scaleSliderUpper - scaleSliderLower) / (color[1].length); // -1?
                    

                    for ( let i = 0; i < (positions2.length - oldPositions.length) / 3; i ++ ) {
                        var remappedIntensity = currentIntensitiesArray[i + oldPositions.length / 3] * (310 / maxIntensity);          // remapuje intenzitu na range 0-310
                        // intenzita pod/nad spodnym thresholdom
                        if(remappedIntensity <= scaleSliderLower){
                            var colorArrayIndex = 0;
                        }else if(remappedIntensity >= scaleSliderUpper){
                            var colorArrayIndex = color[1].length-1;
                        }
                        //intenzita medzi slidermi
                        else{
                            var colorArrayIndex = Math.floor((remappedIntensity - scaleSliderLower) / intStep)
                        }

                        colors.push( color[1][colorArrayIndex].r, color[1][colorArrayIndex].g, color[1][colorArrayIndex].b);
                    }
                    
                }

                setOldColors(colors);
                
                geometry.setAttribute( 
                    'color', 
                    new THREE.Float32BufferAttribute( colors, 3 ) 
                );

                geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(positions2, 3)          //vytvori pole kde kazde tri hodnoty su asociovane s jednym vertexom. pouziva sa ako atribut position pre THREE.Buffergeometry
                );
        
                const material = new THREE.PointsMaterial({
                size: 0.005,
                vertexColors: true,
                });
                const points = new THREE.Points(geometry, material);

                // aktualizacia original points (vsetky body bez filtra) a points s novymi bodmi
                setOriginalPoints(originalPointsArray);
                setOldPositions(positions2);
                setPoints(points);

                //update intenzit
                setOriginalIntensities(originalIntensitiesArray);
                setIntensities(currentIntensitiesArray);
            }
        }
    },[played])
    

    //rekurzivne nacitanie intenzit jednotlivych suborov v real time mode
    function loadIntensities(iteration){

        setStatusMessage("Loading real-time intensities");
        setRealtimeIntensitiesLoaded(false);
        
        const intLoader = new PCDLoader2(); 
        const intfr = new FileReader();  
        intfr.readAsArrayBuffer(fileArray[iteration]);

        intfr.addEventListener('loadend', function() {
            var intensities2 = intLoader.parse(intfr.result).geometry.attributes.intensity.array;
            setIntensitiesArray(intensitiesArray => [...intensitiesArray, intensities2]);
            if(iteration < maxFiles){
                loadIntensities(iteration + 1);
            }else{
                setIntensitiesArrayLoaded(true);

                setRealtimeIntensitiesLoaded(true);
            }
        });
    }

    // update min a max intenzit v real time mode po nacitani suborov s intenzitami
    useEffect(()=>{
        if(originalIntensities && pointsMode == "real-time"){

            var minIntensityR = originalIntensities[0];
            var maxIntensityR = originalIntensities[0];

            for(var j = 0; j < originalIntensities.length; j++){
                if(originalIntensities[j] < minIntensityR){
                    minIntensityR = originalIntensities[j];
                }
                if(originalIntensities[j] > maxIntensityR){
                    maxIntensityR = originalIntensities[j];
                }
            }


            setMaxIntensity(maxIntensityR);
            setMinIntensity(minIntensityR);
        }
    },[originalIntensities])

    //reakcia na zmenu modu zobrazovania bodov
    useEffect(()=>{
        if(pointsMode == "real-time"){
            scene.remove(points);
            //nacita body zo suborov
            loadIntoFileArray(0);
            loadTimestamps();
        }else{
            //vynuluje real-time premenne a inicializuje vykreslovanie
            setTimestampIndex(0);
            setOldColors(null);
            setOldPositions([]);
            scene.remove(points);
            setUpdateIntensities(!updateIntensities);
            setFileArrayLoaded(false);
        }
    },[pointsMode])
    
    return null;
}

export default PCDPointCloud;