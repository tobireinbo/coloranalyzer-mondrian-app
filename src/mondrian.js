import Jimp from "jimp";
import { getPaletteFromURL } from "color-thief-node";

export async function genMondrian(imageInput) {
  var dominantColors = [];
  var imgWidth = 0;
  var imgHeight = 0;
  var rasterSize = 0;
  var imgPixelAmount = 0;
  var greyArray = [
    { color: { r: 0, g: 0, b: 0 }, amount: 0, percentage: 0 },
    { color: { r: 25, g: 25, b: 25 }, amount: 0, percentage: 0 },
    { color: { r: 50, g: 50, b: 50 }, amount: 0, percentage: 0 },
    { color: { r: 75, g: 75, b: 75 }, amount: 0, percentage: 0 },
    { color: { r: 100, g: 100, b: 100 }, amount: 0, percentage: 0 },
    { color: { r: 125, g: 125, b: 125 }, amount: 0, percentage: 0 },
    { color: { r: 150, g: 150, b: 150 }, amount: 0, percentage: 0 },
    { color: { r: 175, g: 175, b: 175 }, amount: 0, percentage: 0 },
    { color: { r: 200, g: 200, b: 200 }, amount: 0, percentage: 0 },
    { color: { r: 225, g: 225, b: 225 }, amount: 0, percentage: 0 },
    { color: { r: 255, g: 255, b: 255 }, amount: 0, percentage: 0 },
  ];

  /*
   *
   * Erstellt Farbpallette
   *
   */

  const pallette = await getPaletteFromURL(imageInput, 20, 1);

  for (let i = 0; i < pallette.length; i++) {
    dominantColors.push({
      color: { r: pallette[i][0], g: pallette[i][1], b: pallette[i][2] },
    });
  }

  /*
   *
   * Liest Quellbild ein
   *
   */
  Jimp.read(imageInput, (err, imageSrc) => {
    if (err) throw err;

    console.log("test");
    imgWidth = imageSrc.bitmap.width;
    imgHeight = imageSrc.bitmap.height;
    rasterSize = Math.floor(imgWidth / 30);
    const greyscaleImageWidth = Math.floor(imgWidth / 15);
    const finalExport = new Jimp(
      imgWidth + greyscaleImageWidth,
      imgHeight,
      0xffffffff
    );

    imageSrc.pixelate(rasterSize);

    /*
     *
     * Analysiert Pixelated Img
     *
     */
    Jimp.read(imageSrc, (err, imagePixelated) => {
      if (err) throw err;

      const normalizedImg = new Jimp(imgWidth, imgHeight, 0xffffffff); //erstelle neues Bild
      for (let j = 0; j <= imgHeight; j += rasterSize) {
        //geht pixelated img in raster schritten durch
        for (let i = 0; i <= imgWidth - rasterSize; i += rasterSize) {
          var currentColor = imagePixelated.getPixelColor(i, j); //aktuelle Farbe

          var drawColor = getSmallestColorDistanceInPallette(
            dominantColors,
            Jimp.intToRGBA(currentColor)
          );

          var size = rasterSize;
          try {
            normalizedImg.scan(
              i,
              j,
              size,
              size,
              makeIteratorThatFillsWithColor(rgbToHex(drawColor))
            );
          } catch (err) {}
        }
      }

      /*
       *
       * Passt Farben an Pallette an
       *
       */
      Jimp.read(normalizedImg, (err, image) => {
        if (err) throw err;

        for (let j = 0; j <= imgHeight; j += rasterSize) {
          //geht pixelated img in raster schritten durch
          for (let i = 0; i <= imgWidth - rasterSize; i += rasterSize) {
            var currentColor = Jimp.intToRGBA(image.getPixelColor(i, j)); //aktuelle Farbe

            var colorRight = Jimp.intToRGBA(
              image.getPixelColor(i + rasterSize, j)
            );

            var colorBelow = Jimp.intToRGBA(
              image.getPixelColor(i, j + rasterSize)
            );

            const borderSize = Math.floor(rasterSize / 10);

            if (colorDistance(currentColor, colorRight) !== 0) {
              try {
                image.scan(
                  i + rasterSize - borderSize,
                  j,
                  borderSize,
                  rasterSize,
                  makeIteratorThatFillsWithColor(rgbToHex({ r: 0, g: 0, b: 0 }))
                );
              } catch (err) {}
            }
            if (colorDistance(currentColor, colorBelow) !== 0) {
              try {
                image.scan(
                  i - borderSize,
                  j + rasterSize - borderSize,
                  rasterSize + borderSize,
                  borderSize,
                  makeIteratorThatFillsWithColor(rgbToHex({ r: 0, g: 0, b: 0 }))
                );
              } catch (err) {}
            }
          }
        }

        finalExport.composite(normalizedImg, 0, 0);

        /*
         *
         * Erstellt GreyScale
         *
         */
        Jimp.read(imageInput, (err, image) => {
          if (err) throw err;

          const greyscaleImage = new Jimp(
            greyscaleImageWidth,
            imgHeight,
            0xffffffff
          ); //erstelle neues Bild

          image.greyscale((err, imgGrey) => {
            imgGrey.scan(
              0,
              0,
              imgGrey.bitmap.width,
              imgGrey.bitmap.height,
              function (x, y, idx) {
                var currentColor = {
                  r: this.bitmap.data[idx],
                  g: this.bitmap.data[idx + 1],
                  b: this.bitmap.data[idx + 2],
                };
                getSmallestColorDistanceInPalletteGrey(greyArray, currentColor);
              }
            );
          });

          imgPixelAmount = image.bitmap.width * image.bitmap.height;
          const imgPixelAmountSmallest = 100 / imgPixelAmount;
          var blockHeightSum = 0;

          for (let n = greyArray.length - 1; n >= 0; n--) {
            greyArray[n].percentage =
              greyArray[n].amount * imgPixelAmountSmallest;

            var blockHeight = Math.floor(
              imgHeight * (greyArray[n].percentage / 100)
            );

            try {
              greyscaleImage.scan(
                0,
                blockHeightSum,
                greyscaleImageWidth,
                blockHeight,
                makeIteratorThatFillsWithColor(rgbToHex(greyArray[n].color))
              );
            } catch (err) {
              console.log(err);
            }
            blockHeightSum += blockHeight;
          }

          finalExport.composite(greyscaleImage, imgWidth, 0);

          console.log(finalExport.getBufferAsync(Jimp.MIME_JPEG));
          return finalExport.getBufferAsync(Jimp.MIME_JPEG);
        });
      });
    });
  });
}

/*
-------------------------------------------------------------------------------------------
FUNCTIONS
-------------------------------------------------------------------------------------------
*/
function makeIteratorThatFillsWithColor(color) {
  return function (x, y, offset) {
    this.bitmap.data.writeUInt32BE(color, offset, true);
  };
}

//https://en.wikipedia.org/wiki/Color_difference

function colorDistance(c1, c2) {
  const distance = Math.sqrt(
    Math.pow(c2.r - c1.r, 2) +
      Math.pow(c2.g - c1.g, 2) +
      Math.pow(c2.b - c1.b, 2)
  );
  return distance;
}

function redmeanColorDistance(c1, c2) {
  const distance = Math.sqrt(
    (2 + redFn(c1.r, c2.r) / 2) * powDiff(c1.r, c2.r) +
      4 * powDiff(c1.g, c2.g) +
      (2 + (255 - redFn(c1.r, c2.r)) / 256) * powDiff(c1.b, c2.b)
  );
  return distance;
}

function powDiff(cs1, cs2) {
  const result = Math.pow(Math.abs(cs2 - cs1), 2);
  return result;
}

function redFn(r1, r2) {
  return (r1 + r2) / 2;
}

function getSmallestColorDistanceInPallette(dominantColors, currentColor) {
  var lastDistance = 255;
  var coloroutput = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < dominantColors.length; i++) {
    var currentDistance = colorDistance(dominantColors[i].color, currentColor);
    if (currentDistance <= lastDistance) {
      coloroutput = dominantColors[i].color;
      lastDistance = currentDistance;
    }
  }
  return coloroutput;
}

function getSmallestColorDistanceInPalletteGrey(dominantColors, currentColor) {
  var lastDistance = 255;
  var indexoutput = 0;
  for (let i = 0; i < dominantColors.length; i++) {
    var currentDistance = colorDistance(dominantColors[i].color, currentColor);
    if (currentDistance <= lastDistance) {
      indexoutput = i;

      lastDistance = currentDistance;
    }
  }
  dominantColors[indexoutput].amount += 1;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex({ r, g, b }) {
  return (
    "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b) + "ff"
  );
}

/*Drawing Code
https://runkit.com/5837aadc97657a0014e13f3e/5837aadc2864a00013d4e123
*/
