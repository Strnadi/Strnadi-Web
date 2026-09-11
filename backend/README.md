# Backend integration

Copy `MapController.cs` and `MapyCzProxyRegistration.cs` into the ASP.NET Core
backend, then register the pooled client before `builder.Build()`:

```csharp
builder.Services.AddMapyCzProxy(builder.Configuration);
```

The frontend now prefers this lightweight endpoint for recording markers:

```http
GET /recordings/map-points?north=...&south=...&west=...&east=...
    &filter=new&onlyDialects=false&userId=...
```

Its JSON response is an array with this shape:

```json
{
  "recordingId": 123,
  "recordingPartId": 456,
  "latitude": 49.9,
  "longitude": 15.5,
  "colors": ["#c2410c"],
  "fromModel": false,
  "fromUser": false,
  "confirmed": true
}
```

The database query should project directly to these fields and apply the
bounding box and filters before materialization (`AsNoTracking()` in EF Core).
Do not load audio, complete recordings, or complete part collections. Until the
endpoint is deployed, the frontend automatically falls back to the legacy
recordings endpoints after the first 404 response.
