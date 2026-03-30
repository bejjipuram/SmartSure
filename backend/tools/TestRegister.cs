using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

var client = new HttpClient();
var json = "{\"email\":\"verify_test@gmail.com\",\"fullName\":\"Verify Test\",\"password\":\"Test@123\"}";
var content = new StringContent(json, Encoding.UTF8, "application/json");

try {
    var response = await client.PostAsync("http://localhost:5001/api/auth/register", content);
    Console.WriteLine($"Status: {response.StatusCode}");
    Console.WriteLine(await response.Content.ReadAsStringAsync());
} catch (Exception ex) {
    Console.WriteLine($"Error: {ex.Message}");
}
