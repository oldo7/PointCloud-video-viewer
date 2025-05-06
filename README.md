# Point cloud video viewer

This application allows the user to view pointcloud data from a perspective given by a set of rotations and positions of the camera. The user can also use a video as a background for the pointcloud animation. It was developed to visualize data from a LIDAR scanner placed on a moving train. The user can modify the color of the points, filter them based on intensity or adjust camera rotation.

## How to run

You can run the current version of the application at [https://ondrejklima.cloud/xnemce08/](https://ondrejklima.cloud/xnemce08/) (Username: `point`, Password: `cloud`). Alternatively, you can use the source files to run on a local development server or build for production by following these steps:


1. In the root project directory (where this README is located), run `npm install`. This will download all project dependencies into the **node_modules** folder.
2. Due to a problem with the OpenCV javascript library, it may be necessary to append the following to line 313 in **node_modules/react-scripts/config/webpack.config.js**:
```
fallback: {
        fs: false,
        path: false,
        crypto: false
      },
```
3. Run the application on a local development server or build the application for production.
    - In order to run the application on a local development server, run `npm run start` in the root project directory. This will run the application in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
    - In order to build the app for production, run `npm run build`. This command will build the app to the `build` folder. If the application will be running in a subdirectory (for example **http://example.com/subdirectory/** instead of **http://example.com**), append the following line to **package.json** before building the app:
    ``"homepage":"subdirectory/",``, where **subdirectory** is the name of your subdirectory.

## How to use
By default, the application shows pre-loaded data to showcase it's functionality. You can upload your data using the "Upload files" button. You should then set the correct animation FPS, to match the speed of the video. Animation FPS determines, how many times per second will the camera move according to the provided rotation and position values. Use the controls on the bottom of the screen to control both the video and pointcloud animation. You can use any functions in the right panel during playback. Each function contains a hint explaining the individual inputs further.

## File format specification

#### Camera positions
A .csv file containing the list of positions of the camera. Each line contains exactly one position. Each position consists of 3 values, which represent coordinates in the same coordinate system as the provided pointcloud. The order of the coordinates on each line is YZX, and the individual coordinates are separated by a comma.

#### Camera rotations
A .csv file containing the list of rotations of the camera. Each line contains exactly one rotation. Each rotation consists of 3 values, which represent angles in degrees in the individual axes (euler angles). The first value represents angle of rotation around the Z axis, then angle of rotation around the Y axis and the last value represents rotation around the X axis. Each value is separated by a comma. The order in which the rotations are applied can be set in the 'Rotation order' textfield. It is defined as a set of uppercase letters 'XYZ', where the order of the letters represents the order of rotation around the given axis. Each rotation is applied to default rotation, which is (0,0,0), not the previous rotation.

#### PointCloud file
A .pcd file containing the pointcloud data. Each point is required to have an intensity value.

#### Video file
A video file to be played in the background. You can use file paths (direct URL to video file) or links to videos on YouTube, Facebook, Twitch, SoundCloud, Streamable, Vimeo, Wistia, Mixcloud, DailyMotion and Kaltura.



##### Created by Oliver Nemček under supervision from Ing. Ondřej Klíma, Ph.D. at Brno University of technology