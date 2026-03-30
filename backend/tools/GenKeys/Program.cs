using System.Security.Cryptography;

var rsa = RSA.Create(2048);
var privateKey = rsa.ExportRSAPrivateKeyPem();
var publicKey = rsa.ExportRSAPublicKeyPem();

var keysDir = Path.Combine(Directory.GetCurrentDirectory(), "Keys");
Directory.CreateDirectory(keysDir);

File.WriteAllText(Path.Combine(keysDir, "private.pem"), privateKey);
File.WriteAllText(Path.Combine(keysDir, "public.pem"), publicKey);

Console.WriteLine("=== Private Key ===");
Console.WriteLine(privateKey);
Console.WriteLine("=== Public Key ===");
Console.WriteLine(publicKey);
Console.WriteLine("Keys written to " + keysDir);
