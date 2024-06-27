const fs = require('fs')
const { PNG } = require('pngjs')

const paletteName = process.argv[2]
const fileIn = process.argv[3]
const fileOut = process.argv[4]

if (!paletteName || !fileIn || !fileOut) {
  throw new Error('Usage: `node palette-quantize.js [PALETTE_FILE_NAME] [INPUT_FILE_NAME] [OUTPUT_FILE_NAME]`')
}

const paletteFile = fs.readFileSync(paletteName, 'utf8')
const fileLines = paletteFile.split('\n')
if (fileLines[0] !== 'GIMP Palette') {
  throw new Error('Is this a Gimp Palette?')
}

const colors = fileLines
  .filter((line, i) => i && line && line[0] !== '#')
  .map(str => str.split('\t'))
  .map(([r, g, b]) => [parseInt(r), parseInt(g), parseInt(b)])

const findColor = (r, g, b, list) => {
  let best, bestDistance = 16777216
  for (let i = 0; i < list.length; i++) {
    const distance = Math.pow(Math.abs(r - list[i][0]), 2) + Math.pow(Math.abs(g - list[i][1]), 2) + Math.pow(Math.abs(b - list[i][2]), 2)
    if (distance < bestDistance) {
      best = list[i]
      bestDistance = distance
    }
  }

  return best
}

fs.createReadStream(fileIn)
  .pipe(new PNG({ filterType: 4 }))
  .on("parsed", function () {
    let pixels = 0

    console.time('recolored')

    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        var idx = (this.width * y + x) << 2

        if (this.data[idx + 3] !== 0) {
          const [r, g, b] = findColor(this.data[idx], this.data[idx + 1], this.data[idx + 2], colors)
          this.data[idx] = r
          this.data[idx + 1] = g
          this.data[idx + 2] = b
        }
      }
    }

    console.timeEnd('recolored')
    console.log('writing to:', fileOut)

    this.pack().pipe(fs.createWriteStream(fileOut))
  })
