namespace API.Dtos;

public class AddApartmentDto
{
    public float PriceAZN { get; set; }
    public float Bedrooms { get; set; }
    public float Bathrooms { get; set; }
    public float Sqm { get; set; }
    public string City { get; set; } = string.Empty;
}
