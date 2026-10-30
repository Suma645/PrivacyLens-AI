using System;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using Windows.Foundation;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;

namespace WindowsOcrTool
{
    class Program
    {
        static T Wait<T>(IAsyncOperation<T> op)
        {
            while (op.Status == AsyncStatus.Started)
            {
                Thread.Sleep(5);
            }
            if (op.Status == AsyncStatus.Error)
            {
                throw new Exception("AsyncOperation failed: " + op.ErrorCode.Message);
            }
            return op.GetResults();
        }

        static void Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("[]");
                return;
            }

            string filePath = Path.GetFullPath(args[0]);
            if (!File.Exists(filePath))
            {
                Console.WriteLine("[]");
                return;
            }

            try
            {
                StorageFile file = Wait(StorageFile.GetFileFromPathAsync(filePath));
                var stream = Wait(file.OpenAsync(FileAccessMode.Read));
                BitmapDecoder decoder = Wait(BitmapDecoder.CreateAsync(stream));
                SoftwareBitmap softwareBitmap = Wait(decoder.GetSoftwareBitmapAsync());

                OcrEngine engine = OcrEngine.TryCreateFromUserProfileLanguages();
                if (engine == null)
                {
                    engine = OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("en-US"));
                }

                if (engine == null)
                {
                    Console.WriteLine("[]");
                    return;
                }

                OcrResult result = Wait(engine.RecognizeAsync(softwareBitmap));

                var tokens = new List<string>();
                foreach (var line in result.Lines)
                {
                    foreach (var word in line.Words)
                    {
                        string safeText = word.Text.Replace("\\", "\\\\").Replace("\"", "\\\"");
                        int x = (int)Math.Round(word.BoundingRect.X);
                        int y = (int)Math.Round(word.BoundingRect.Y);
                        int w = (int)Math.Max(8, Math.Round(word.BoundingRect.Width));
                        int h = (int)Math.Max(8, Math.Round(word.BoundingRect.Height));

                        tokens.Add(string.Format("{{\"text\":\"{0}\",\"box\":{{\"x\":{1},\"y\":{2},\"width\":{3},\"height\":{4}}},\"conf\":0.95}}",
                            safeText, x, y, w, h));
                    }
                }

                Console.WriteLine("[" + string.Join(",", tokens) + "]");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error: " + ex.Message);
                Console.WriteLine("[]");
            }
        }
    }
}
