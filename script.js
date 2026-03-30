import { ImageSegmenter, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

// const local var
// =======================================================================================
const legendColors = [
  [255, 197, 0, 255], // Vivid Yellow
  [128, 62, 117, 255], // Strong Purple
  [255, 104, 0, 255], // Vivid Orange
  [166, 189, 215, 255], // Very Light Blue
  [193, 0, 32, 255], // Vivid Red
  [206, 162, 98, 255], // Grayish Yellow
  [129, 112, 102, 255], // Medium Gray
  [0, 125, 52, 255], // Vivid Green
  [246, 118, 142, 255], // Strong Purplish Pink
  [0, 83, 138, 255], // Strong Blue
  [255, 112, 92, 255], // Strong Yellowish Pink
  [83, 55, 112, 255], // Strong Violet
  [255, 142, 0, 255], // Vivid Orange Yellow
  [179, 40, 81, 255], // Strong Purplish Red
  [244, 200, 0, 255], // Vivid Greenish Yellow
  [127, 24, 13, 255], // Strong Reddish Brown
  [147, 170, 0, 255], // Vivid Yellowish Green
  [89, 51, 21, 255], // Deep Yellowish Brown
  [241, 58, 19, 255], // Vivid Reddish Orange
  [35, 44, 22, 255], // Dark Olive Green
  [0, 161, 194, 255] // Vivid Blue
];

// get elems
// =======================================================================================
const canvas_elem = document.getElementById("segmented-canvas");
const cropped_elem = document.getElementById("cropped-canvas");
const img_elem = document.getElementById("target-img");
const button_elem = document.getElementById("segment-click");
console.log("get elems completed!");

// initialize segmenter
// =======================================================================================
let imageSegmenter;
const runningMode = "IMAGE";

async function createImageSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-assets/deeplabv3.tflite?generation=1661875711618421",
    },
    outputCategoryMask: true,
    outputConfidenceMasks: true,
    runningMode: runningMode
  });
}
createImageSegmenter();

// helper functions
// =======================================================================================
function get_transform_origin(avg_x, avg_y, edge_arr){ // returns string
  // TODO
  console.log("edge_array: " + edge_arr);
  let final_pos = "";

  if (edge_arr[0]){
    final_pos += "top ";
  }

  if (edge_arr[1]){
    final_pos += "left ";
  }

  if (edge_arr[2]){
    final_pos += "bottom ";
  }

  if (edge_arr[3]){
    final_pos += "right ";
  }

  if (final_pos.length == 0) {
    // TODO
    final_pos += (avg_x + "px " + avg_y + "px");
  }

  return final_pos;

}
function visual_effects_demo(transform_origin_val){
    // 1. create enlarge effect
    const enlarge_div = document.getElementById("enlarge_div");
    const enlarge_ref_img = document.getElementById("enlarge_ref");
    const enlarge_img = document.createElement("img");
    
    enlarge_img.src = "/home/rtj/Downloads/canvas-image.png";
    enlarge_div.appendChild(enlarge_img);
    enlarge_img.classList.add("segmented-class", "enlarge-pulse");
    enlarge_img.style.transformOrigin = transform_origin_val;
    enlarge_ref_img.classList.add("blur");


    // 2. create rotate effect
    const rotate_div = document.getElementById("rotate_div");
    const rotate_ref_img = document.getElementById("rotate_ref");
    const rotate_img = document.createElement("img");

    rotate_img.src = "/home/rtj/Downloads/canvas-image.png";
    rotate_div.appendChild(rotate_img);
    rotate_img.classList.add("segmented-class", "rotate-pulse");
    rotate_img.style.transformOrigin = transform_origin_val;
    rotate_ref_img.classList.add("blur");

    // 3. TODO
}

function callback(result) {
    console.log("result obtained! drawing on canvas....");

    // 1. create the mask to overlap with the original image
    const cxt = canvas_elem.getContext("2d");
    const { width, height } = result.categoryMask;
    let imageData = cxt.getImageData(0, 0, width, height).data;
    canvas_elem.width = width;
    canvas_elem.height = height;
    const mask = result.categoryMask.getAsUint8Array();
    for (let i in mask) {
        const legendColor = legendColors[mask[i] % legendColors.length];
        imageData[i * 4] = (legendColor[0] + imageData[i * 4]) / 2;
        imageData[i * 4 + 1] = (legendColor[1] + imageData[i * 4 + 1]) / 2;
        imageData[i * 4 + 2] = (legendColor[2] + imageData[i * 4 + 2]) / 2;
        imageData[i * 4 + 3] = (legendColor[3] + imageData[i * 4 + 3]) / 2;
    }
    const uint8Array = new Uint8ClampedArray(imageData.buffer);
    const dataNew = new ImageData(uint8Array, width, height);
    cxt.putImageData(dataNew, 0, 0);

    // ensure canvas overlays at the top of img_elem
    canvas_elem.style.zIndex = 4;
    img_elem.style.zIndex = 1;


    console.log("now drawing the cropped image...");

    // 2. now drawing the cropped image only on a second canvas
    const cxt_2 = cropped_elem.getContext("2d");
    
    cropped_elem.width = width;
    cropped_elem.height = height;
    //cropped_elem.classList.remove("disappear");
    cxt_2.drawImage(img_elem, 0, 0);

    let cropped_image_data = cxt_2.getImageData(0, 0, width, height).data;
    let cum_x = 0; // coord in pixels. start from 0
    let cum_y = 0;
    let counter = 0;
    let edge_anchor = [false, false, false, false]; // top right bottom left

    for (let i in mask) {
        if (mask[i] == 0) {
            cropped_image_data[i*4 + 0] = 0;
            cropped_image_data[i*4 + 1] = 0;
            cropped_image_data[i*4 + 2] = 0;
            cropped_image_data[i*4 + 3] = 0;
        } else {
          // TODO
          cum_x += (i % width); 
          cum_y += Math.floor(i / width);
          counter += 1;

          switch (Math.floor(i / width)) {
            case 0:
              edge_anchor[0] = true;
            case height - 1:
              edge_anchor[2] = true;
          }

          switch (i % width) {
            case 0:
              edge_anchor[1] = true;
            case width - 1:
              edge_anchor[3] = true;
          }
        }
    }

    let transform_origin_val = get_transform_origin(Math.floor(cum_x / counter), Math.floor(cum_y / counter), edge_anchor);
    console.log("transform_origin: " + transform_origin_val);

    const cropped_uint8Array = new Uint8ClampedArray(cropped_image_data.buffer);
    const cropped_dataNew = new ImageData(cropped_uint8Array, width, height);
    cxt_2.putImageData(cropped_dataNew, 0, 0);

    // 3. saving canvas as png img
    const link = document.createElement("a");
    link.download = "canvas-image.png";
    link.href = cropped_elem.toDataURL("images/png");
    link.click();

    // 4. call other functions
    visual_effects_demo(transform_origin_val);
}


function segment_image() {
    console.log("segmenting image...");
    imageSegmenter.segment(img_elem, callback); // function from google's img segmenter
}

// segment on click
// =======================================================================================
button_elem.addEventListener("click", segment_image);

// TODO
// =======================================================================================
console.log("all completed!");