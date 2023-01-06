const sharp = require('sharp');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client();

// 고양이.png
// %CD%AE%AW.png
exports.handler = async (event, context, callback) => {
    const Bucket = event.Records[0].s3.bucket.name;
    const Key = decodeURIComponent(event.Records[0].s3.object.key); // original/고양이.png
    const filename = Key.split('/').at(-1);
    const ext = Key.split('.').at(-1).toLowerCase();
    const requiredFormat = ext === 'jpg' ? 'jpeg' : ext;
    console.log('name', filename, 'ext', ext);

    const toBuffer = async function (stream) {
        const list = []
        const reader = stream.getReader()
        while (true) {
            const { value, done } = await reader.read()
            if (value)
                list.push(value)
            if (done)
                break
        }
        return Buffer.concat(list)
    };

    try {
        const getObject = await s3.send(new GetObjectCommand({ Bucket, Key }));
        const imageBuffer = await toBuffer(getObject.Body);
        console.log('put', imageBuffer.length);
        const resizedImage = await sharp(imageBuffer)
            .resize(200, 200, { fit: 'inside' })
            .toFormat(requiredFormat)
            .toBuffer();
        await s3.send(new PutObjectCommand({
            Bucket,
            Key: `thumb/${filename}`, // thumb/고양이.png
            Body: resizedImage,
        }))
        console.log('put', resizedImage.length);
        return callback(null, `thumb/${filename}`);
    } catch (error) {
        console.error(error);
        return callback(error);
    }
}
