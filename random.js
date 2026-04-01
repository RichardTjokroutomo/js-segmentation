import { SamModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js';

// Load model and processor
const model = await SamModel.from_pretrained('Xenova/slimsam-77-uniform');
const processor = await AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform');

// Prepare image and input points
const img_url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/corgi.jpg';
const raw_image = await RawImage.read(img_url);
const input_points = [[[340, 250]]];

// Process inputs and perform mask generation
const inputs = await processor(raw_image, { input_points });
const outputs = await model(inputs);

// Post-process masks
const masks = await processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
console.log(masks);
// [
//   Tensor {
//     dims: [ 1, 3, 410, 614 ],
//     type: 'bool',
//     data: Uint8Array(755220) [ ... ],
//     size: 755220
//   }
// ]
const scores = outputs.iou_scores;
console.log(scores);
// Tensor {
//   dims: [ 1, 1, 3 ],
//   type: 'float32',
//   data: Float32Array(3) [
//     0.8350210189819336,
//     0.9786665439605713,
//     0.8379436731338501
//   ],
//   size: 3
// }

const image = RawImage.fromTensor(masks[0][0].mul(255));
image.save('mask.png');
