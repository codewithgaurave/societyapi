# API Documentation: Get My Available Needs

## Endpoint
```
GET /api/needs/my-available-needs/:userId
```

## Description
Service provider ko unki **availability colonies** aur **service category** ke basis par **open needs** milti hain.

## Filters Applied
1. ✅ User ki **service category** match honi chahiye
2. ✅ User ki **availability colonies** mein need honi chahiye
3. ✅ Need ka status **"open"** hona chahiye

## Request

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | String | Yes | Service provider ki MongoDB ObjectId |

### Example Request
```
GET /api/needs/my-available-needs/6789abc123def456
```

## Response

### Success Response (200 OK)

#### When needs are found:
```json
{
  "message": "5 needs milein aapki available colonies mein",
  "count": 5,
  "needs": [
    {
      "_id": "64f1234567890abcdef12345",
      "description": "Plumber needed for bathroom repair",
      "status": "open",
      "user": {
        "_id": "64f9876543210fedcba98765",
        "fullName": "Rajesh Kumar",
        "mobileNumber": "9876543210",
        "registrationID": "REG001"
      },
      "serviceCategory": {
        "_id": "64f1111111111111111111111",
        "name": "Plumbing"
      },
      "colony": {
        "_id": "64f2222222222222222222222",
        "name": "Green Valley Society",
        "address": "Sector 12, Dwarka",
        "city": "New Delhi",
        "pincode": 110075
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### When no availability is set:
```json
{
  "message": "Pehle availability set karein",
  "needs": []
}
```

### Error Responses

#### User Not Found (404)
```json
{
  "message": "User not found"
}
```

#### Server Error (500)
```json
{
  "message": "Server error"
}
```

## Use Case
Jab service provider apne dashboard pe dekhna chahta hai ki:
- Unki **service category** (e.g., Plumbing, Electrician) ki
- Unki **available colonies** mein
- Kaunsi **open needs** hain

## Example Usage in App

### JavaScript/Axios
```javascript
const userId = "6789abc123def456";

axios.get(`/api/needs/my-available-needs/${userId}`)
  .then(response => {
    console.log(`Total needs: ${response.data.count}`);
    console.log(response.data.needs);
  })
  .catch(error => {
    console.error(error.response.data.message);
  });
```

### React Example
```javascript
const fetchMyAvailableNeeds = async (userId) => {
  try {
    const response = await fetch(`/api/needs/my-available-needs/${userId}`);
    const data = await response.json();
    
    if (data.count > 0) {
      setNeeds(data.needs);
      setMessage(data.message);
    } else {
      setMessage("Pehle availability set karein");
    }
  } catch (error) {
    console.error("Error fetching needs:", error);
  }
};
```

## Notes
- ✅ Sirf **open status** ki needs return hongi
- ✅ Needs **latest first** (createdAt desc) order mein hongi
- ✅ User ki **serviceCategory** automatically detect hoti hai
- ✅ Agar availability set nahi hai, to empty array milegi
- ✅ Populated data milega: user, serviceCategory, colony

## Testing

### Test Case 1: Valid User with Availability
```bash
curl -X GET http://localhost:5000/api/needs/my-available-needs/6789abc123def456
```

### Test Case 2: User without Availability
```bash
# Response: { "message": "Pehle availability set karein", "needs": [] }
```

### Test Case 3: Invalid User ID
```bash
curl -X GET http://localhost:5000/api/needs/my-available-needs/invalidid123
# Response: { "message": "User not found" }
```
