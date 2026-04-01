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
const section_elem = document.getElementById("samples");
const img_elem = document.getElementById("target-img");
const button_elem = document.getElementById("segment-click");
// const enlarge_ref_img = document.getElementById("enlarge_ref");
// const rotate_ref_img = document.getElementById("rotate_ref");
// const image_upload_elem = document.getElementById("image-upload");
console.log("get elems completed!");

// initialize deeplab v3 segmenter
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
console.log("deeplab-v3 ready!");

// initialize HF segmenter
// =======================================================================================
import { SamModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const model = await SamModel.from_pretrained('Xenova/slimsam-77-uniform');
const processor = await AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform');
console.log("slimslam-77 ready!");

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

function visual_effects_demo(transform_origin_val, base_canvas){
    // Generate data URL from canvas
    const dataUrl = base_canvas.toDataURL("image/png");

    // 1. create enlarge effect
    const enlarge_div = document.getElementById("enlarge_div");
    const enlarge_ref_img = document.getElementById("enlarge_ref");

    // Remove previous effect images
    const prevEnlargeEffects = enlarge_div.querySelectorAll('.segmented-class');
    prevEnlargeEffects.forEach(img => {
        if (img !== enlarge_ref_img) img.remove();
    });

    const enlarge_img = document.createElement("img");
    enlarge_img.src = dataUrl;
    enlarge_div.appendChild(enlarge_img);
    enlarge_img.classList.add("segmented-class", "enlarge-pulse");
    enlarge_img.style.transformOrigin = transform_origin_val;
    enlarge_ref_img.classList.add("blur");


    // 2. create rotate effect
    const rotate_div = document.getElementById("rotate_div");
    const rotate_ref_img = document.getElementById("rotate_ref");

    // Remove previous effect images
    const prevRotateEffects = rotate_div.querySelectorAll('.segmented-class');
    prevRotateEffects.forEach(img => {
        if (img !== rotate_ref_img) img.remove();
    });

    const rotate_img = document.createElement("img");
    rotate_img.src = dataUrl;
    rotate_div.appendChild(rotate_img);
    rotate_img.classList.add("segmented-class", "rotate-pulse");
    rotate_img.style.transformOrigin = transform_origin_val;
    rotate_ref_img.classList.add("blur");

    // 3. TODO
}

async function callback(result) {
    // 1. create the mask to overlap with the original image
    // ============================================================================
    console.log("result obtained! drawing on canvas....");
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



    // 2. now drawing the cropped image only on a second canvas
    // ============================================================================
    console.log("now drawing the cropped image...");
    const cxt_2 = cropped_elem.getContext("2d");
    
    cropped_elem.width = width;
    cropped_elem.height = height;
    //cropped_elem.classList.remove("disappear");
    cxt_2.drawImage(img_elem, 0, 0);
    let cropped_image_data = cxt_2.getImageData(0, 0, width, height).data;

    let cum_x = 0; // coord in pixels. start from 0
    let cum_y = 0;
    let counter = 0;
    let pointList = [];

    let edge_anchor = [false, false, false, false]; // top right bottom left

    for (let i in mask) {
        if (mask[i] == 0) {
            cropped_image_data[i*4 + 0] = 0;
            cropped_image_data[i*4 + 1] = 0;
            cropped_image_data[i*4 + 2] = 0;
            cropped_image_data[i*4 + 3] = 0;
        } else {
          // TODO
          pointList.push([(i % width), Math.floor(i / width)]);
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

    const cropped_uint8Array = new Uint8ClampedArray(cropped_image_data.buffer);
    const cropped_dataNew = new ImageData(cropped_uint8Array, width, height);
    cxt_2.putImageData(cropped_dataNew, 0, 0);

    // 3. saving canvas as png img
    //const link = document.createElement("a");
    //link.download = "canvas-image.png";
    //link.href = cropped_elem.toDataURL("images/png");
    //link.click();

    // 3. do 2nd stage inference
    // ============================================================================
    console.log("begin second stage inference....");
    console.log("width: " + width + "; height: " + height);
    const img_url = await RawImage.read(img_elem.src);

    const input_points = [[ [Math.floor(cum_x / counter), Math.floor(cum_y / counter)] ]]; // This creates [[ [[x,y], [x,y]] ]]
    const inputs = await processor(img_url, {input_points});
    const outputs = await model(inputs);
    const masks = await processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
    const maskTensor = masks[0][0].gt(0).mul(255);
    const mask_image = RawImage.fromTensor(maskTensor);
    //await mask_image.save('mask.png');
    console.log("second stage inference completed!");

    // 4. segment image based on mask
    // ============================================================================
    // const cropped = img_url.putAlpha(image.convert(1));
    // cropped.save('segmented-v1.png');


    // 5. try to create a better segmented image
    // ============================================================================

    // create base canvas
    const base_canvas = document.createElement("canvas");
    const cxt_3 = base_canvas.getContext("2d");
    console.log("base canvas width: " + width + "; height: " + height);
    base_canvas.width = width;
    base_canvas.height = height;
    cxt_3.drawImage(img_elem, 0, 0);
    const base_canvas_image_data = cxt_3.getImageData(0, 0, width, height).data;
    console.log("base canvas image data length:", base_canvas_image_data.length, "expected:", width * height * 4);
    

    // create mask from tensor directly
    const maskTensorData = maskTensor.data; // Uint8Array of shape [height, width]
    console.log("mask tensor dims:", maskTensor.dims, "expected: [", height, ",", width, "]");
    if (maskTensorData.length !== width * height) {
        console.error("Mask tensor size mismatch! tensor length:", maskTensorData.length, "expected:", width * height);
    }
    const mask_image_data = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < maskTensorData.length; i++) {
        const maskValue = maskTensorData[i] > 0 ? 255 : 0; // threshold to 0 or 255
        const idx = i * 4;
        mask_image_data[idx] = maskValue;     // R
        mask_image_data[idx + 1] = maskValue; // G
        mask_image_data[idx + 2] = maskValue; // B
        mask_image_data[idx + 3] = 255;       // A
    }

    console.log("mask tensor data length:", maskTensorData.length, "expected:", width * height);
    console.log("mask image data length:", mask_image_data.length, "expected:", width * height * 4);

    // apply mask to 3rd canvas
    cum_x = 0; // coord in pixels. start from 0
    cum_y = 0;
    counter = 0;
    
    for (let i = 0; i < mask_image_data.length / 4; i++) {
        const maskR = mask_image_data[i * 4];
        const maskG = mask_image_data[i * 4 + 1];
        const maskB = mask_image_data[i * 4 + 2];
        if (maskR === 0 && maskG === 0 && maskB === 0) {
            base_canvas_image_data[i * 4 + 3] = 0;
        } else {
          cum_x += (i % width); 
          cum_y += Math.floor(i / width);
          counter += 1;
        }
    }
    let transform_origin_val = get_transform_origin(Math.floor(cum_x / counter), Math.floor(cum_y / counter), edge_anchor);
    console.log("transform_origin: " + transform_origin_val);

    // save 3rd canvas
    const base_canvas_uint8Array = new Uint8ClampedArray(base_canvas_image_data.buffer);
    const base_canvas_dataNew = new ImageData(base_canvas_uint8Array, width, height);
    cxt_3.putImageData(base_canvas_dataNew, 0, 0);
    console.log("base_canvas width: " + base_canvas.width + "; height: " + base_canvas.height);

    const link = document.createElement("a");
    link.download = "canvas-image-cropped.png";
    link.href = base_canvas.toDataURL("image/png");
    //link.click();

    // 6. call other functions
    // ============================================================================
    visual_effects_demo(transform_origin_val, base_canvas);
    section_elem.classList.remove("disappear");
}


function segment_image() {
    button_elem.style.backgroundColor = "red";
    console.log("segmenting image...");
    imageSegmenter.segment(img_elem, callback); // function from google's img segmenter
}

// function handleImageUpload(event) {
//     section_elem.classList.add("disappear");
//     const file = event.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = function(e) {
//         const dataUrl = e.target.result;

//         // Clear previous segmentation canvas
//         const canvasCtx = canvas_elem.getContext("2d");
//         canvasCtx.clearRect(0, 0, canvas_elem.width, canvas_elem.height);

//         // Set up load handler before changing src
//         let hasSegmented = false;
//         const performSegmentation = () => {
//             if (hasSegmented) return;
//             hasSegmented = true;
//             console.log("New image loaded, triggering segmentation");
//             segment_image();
//         };

//         img_elem.onload = performSegmentation;
//         img_elem.onerror = function() {
//             console.error("Failed to load uploaded image");
//         };

//         // Update all image sources
//         img_elem.src = dataUrl;
//         if (enlarge_ref_img) enlarge_ref_img.src = dataUrl;
//         if (rotate_ref_img) rotate_ref_img.src = dataUrl;

//         // If image is already loaded (cached), onload may not fire
//         if (img_elem.complete) {
//             performSegmentation();
//         }
//     };
//     reader.readAsDataURL(file);
// }

// segment on click
// =======================================================================================
button_elem.addEventListener("click", segment_image);

// file upload handler
// =======================================================================================
// if (image_upload_elem) {
//     image_upload_elem.addEventListener("change", handleImageUpload);
// }

// TODO
// =======================================================================================
console.log("all completed!");