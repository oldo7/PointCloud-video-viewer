// Autor: Oliver Nemček
// Komponent ovládania kamery

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { cos, matrix, multiply, sin, min } from 'mathjs'

function MyCameraControls(props){
    //aktualny frame ktory sa ma zobrazit
    var frame_no = props.frame_no;

    //uzivatelom nastavene hodnoty na manualne doladenie pozicie a rotacie kamery
    var cameraPosition = props.cameraPosition;
    var cameraRotation = props.cameraRotation;
    var cameraOffset = props.cameraOffset;

    //uzivatelom dodane subory a ich parametre
    var rotFile = props.rotFile;
    var transFile = props.transFile;
    var rotationOrder = props.rotationOrder;

    //status bar - status nacitania jednotlivych elementov / suborov
    var setCameraPositionsLoaded = props.setCameraPositionsLoaded;
    var setCameraRotationsLoaded = props.setCameraRotationsLoaded;
    var setStatusMessage = props.setStatusMessage;

    //pozicia a rotacia aktualneho framu
    const [fullPosition, setFullPosition] = useState([0,0,0])
    const [fullRotation, setFullRotation] = useState([0,0,0])

    //pole obsahujuce hodnoty nacitane zo suborov pre rotacie / pozicie
    const [rotationArray, setRotationArray] = useState(null);
    const [positionArray, setPositionArray] = useState(null);
    const [maxFrame, setMaxFrame] = useState(0)

    
    const {camera} = useThree()

    //reakcia na zmenu aspect ratio
    var aspectR = props.aspectRatio;
    useEffect(()=>{
        if(aspectR){
            camera.aspect = aspectR;
        }
    },[aspectR])


    //inicialne nacitanie hodnoty pozicie / rotacie zo suborov
    useEffect(()=>{
        setStatusMessage("Loading initial rotations and positions");
        setCameraPositionsLoaded(false);
        setCameraRotationsLoaded(false);

        //nacitanie hodnot rotacie
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "./csv/rot_joined.csv", false);
        xmlhttp.send();
        if (xmlhttp.status==200) {
            var rotresult = xmlhttp.responseText;
            setRotationArray(rotresult.split('\n').map(line => line.split(',')))

            setCameraRotationsLoaded(true);
        }
        else{
            console.log("error fetching rotation CSV")
        }

        //nacitanie hodnot pozicie
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "./csv/trans_joined.csv", false);
        xmlhttp.send();
        if (xmlhttp.status==200) {
            var posresult = xmlhttp.responseText;
            setPositionArray(posresult.split('\n').map(line => line.split(',')))

            setCameraPositionsLoaded(true);
        }
        else{
            console.log("error fetching CSV")
        }
        //index najvyssieho snimku ktory moze byt vygenerovany pomocou dodanych suborov
        setMaxFrame(min(posresult.split('\n').length - 2, rotresult.split('\n').length - 2))
    },[])


    //nacitanie dat z uzivatelom nahratych suborov
    useEffect(()=>{
        if(rotFile){
            setStatusMessage("Loading camera rotations");
            setCameraRotationsLoaded(false);

            var readerObj = new FileReader()

            readerObj.onload = function() {
                var fileText = readerObj.result
                setRotationArray(fileText.split('\n').map(line => line.split(',')))
                setMaxFrame(min(fileText.split('\n').length - 2, positionArray.length - 2))

                setCameraRotationsLoaded(true);
            }
            readerObj.readAsText(rotFile)
        }
    },[rotFile])

    useEffect(()=>{
        if(transFile){
            setStatusMessage("Loading camera positions");
            setCameraPositionsLoaded(false);
            

            var readerObj2 = new FileReader()

            readerObj2.onload = function() {
                var fileText2 = readerObj2.result
                setPositionArray(fileText2.split('\n').map(line => line.split(',')))
                setMaxFrame(min(fileText2.split('\n').length - 2, rotationArray.length - 2))

                setCameraPositionsLoaded(true);
            }
            readerObj2.readAsText(transFile)
        }
    },[transFile])


    //reakcia na zmenu framu ktory sa ma aktualne zobrazit (ktory sa updatuje pri prehravani videa)
    useEffect(() => {
        if((frame_no > maxFrame)){
            camera.setViewOffset( 0, 0, 0, 0, 0, 0 );
        }else if(rotationArray && positionArray && (frame_no < maxFrame) ){
            camera.setViewOffset( 2048, 1536, cameraOffset[0], cameraOffset[1], 2048, 1536 );
            setFullRotation([parseFloat(rotationArray[frame_no][2]) * Math.PI / 180, parseFloat(rotationArray[frame_no][0] * Math.PI / 180), parseFloat(rotationArray[frame_no][1] * Math.PI / 180)])
            setFullPosition([parseFloat(positionArray[frame_no][0]), parseFloat(positionArray[frame_no][1]), parseFloat(positionArray[frame_no][2])])
        }
    }, [frame_no])

    //aktualizacia pozicie
    useEffect(() => {
        camera.position.set(fullPosition[2] + cameraPosition[0], fullPosition[0] + cameraPosition[1], fullPosition[1] + cameraPosition[2])
    }, [fullPosition, cameraPosition]) 

    //aktualizacia rotacie
    useEffect(() => {
        //rotacia kamery na spravne (0,0,0)
        camera.rotation.set(Math.PI/2,0,-Math.PI/2, 'ZYX')
        //rotacia kamery o uhly ziskane zo suboru v poradi specifikovanom pri nahravani suboru
        for(var i=0; i < rotationOrder.length; i++){
            if(rotationOrder[i] == 'Y'){
                camera.rotateY(-fullRotation[2])
            }else if(rotationOrder[i] == 'Z'){
                camera.rotateZ(fullRotation[1])
            }else if(rotationOrder[i] == 'X'){
                camera.rotateX(fullRotation[0])
            }
        }
        //rotacia kamery o hodnoty manualne zadane uzivatelom
        camera.rotateY(cameraRotation[1]);
        camera.rotateX(cameraRotation[0]);
        camera.rotateZ(cameraRotation[2]);
    }, [fullRotation, cameraRotation])


    //zarovnanie kamery (camera offset)
    useEffect(() => {
        const w = 2048;
        const h = 1536;
        const fullWidth = 2048;
        const fullHeight = 1536;

        camera.setViewOffset( fullWidth, fullHeight, cameraOffset[0], cameraOffset[1], w, h );
    }, [cameraOffset])

    return null;
}

export default MyCameraControls;