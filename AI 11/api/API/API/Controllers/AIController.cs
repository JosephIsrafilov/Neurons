using System.Globalization;
using API.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _dataPath;
        private readonly ILogger<AIController> _logger;

        public AIController(
            IHttpClientFactory factory,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<AIController> logger)
        {
            _httpClient = factory.CreateClient("ai");
            _logger = logger;
            _dataPath = ResolveDataPath(configuration, environment);
        }

        [HttpPost("predict")]
        public async Task<IActionResult> Predict([FromBody] PredictIn predict)
        {
            var res = await _httpClient.PostAsJsonAsync("/predict", predict);
            if (!res.IsSuccessStatusCode)
            {
                return StatusCode((int)res.StatusCode, await res.Content.ReadAsStringAsync());
            }
            var prediction = await res.Content.ReadFromJsonAsync<PredictOutPython>();
            return Ok(prediction);
        }

        [HttpPost("apartments")]
        public async Task<IActionResult> AddApartment([FromBody] AddApartmentDto apartment)
        {
            try
            {
                AppendApartment(apartment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to append apartment to dataset");
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to save apartment to dataset");
            }

            var retrainResponse = await _httpClient.PostAsync("/retrain", null);
            if (!retrainResponse.IsSuccessStatusCode)
            {
                var detail = await retrainResponse.Content.ReadAsStringAsync();
                return StatusCode((int)retrainResponse.StatusCode,
                    $"Apartment saved, but retraining failed: {detail}");
            }

            return Ok(new { message = "Apartment saved and retraining triggered" });
        }

        private string ResolveDataPath(IConfiguration configuration, IWebHostEnvironment environment)
        {
            var configuredPath = configuration["DATA_PATH"];
            var root = environment.ContentRootPath;

            if (string.IsNullOrWhiteSpace(configuredPath))
            {
                return Path.GetFullPath(Path.Combine(root, "../../../ai/data/housing_az_sqm_azn.csv"));
            }

            return Path.GetFullPath(
                Path.IsPathRooted(configuredPath)
                    ? configuredPath
                    : Path.Combine(root, configuredPath));
        }

        private void AppendApartment(AddApartmentDto apartment)
        {
            var linesToAppend = new List<string>();
            if (!System.IO.File.Exists(_dataPath))
            {
                var dir = Path.GetDirectoryName(_dataPath);
                if (!string.IsNullOrWhiteSpace(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                linesToAppend.Add("PriceAZN,Bedrooms,Bathrooms,Sqm,City");
            }

            linesToAppend.Add(string.Join(",",
                apartment.PriceAZN.ToString(CultureInfo.InvariantCulture),
                apartment.Bedrooms.ToString(CultureInfo.InvariantCulture),
                apartment.Bathrooms.ToString(CultureInfo.InvariantCulture),
                apartment.Sqm.ToString(CultureInfo.InvariantCulture),
                apartment.City));

            System.IO.File.AppendAllLines(_dataPath, linesToAppend);
        }
    }
}
