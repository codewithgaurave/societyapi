# API Changes Documentation - Service Category Updates

## Overview
Changed service category handling from **string names** to **ObjectId references** for better performance and data integrity.

---

## 1. User Registration API

### **POST** `/api/users/register`

#### **BEFORE (Old Way)**
```json
{
  "fullName": "John Doe",
  "mobileNumber": 9876543210,
  "password": "password123",
  "address": "123 Main St",
  "pincode": 110001,
  "role": "society service",
  "serviceCategory": "Electrician"  // ❌ String name
}
```

#### **NOW (New Way)**
```json
{
  "fullName": "John Doe",
  "mobileNumber": 9876543210,
  "password": "password123",
  "address": "123 Main St",
  "pincode": 110001,
  "role": "society service",
  "serviceCategory": "64f1a2b3c4d5e6f7g8h9i0j1"  // ✅ ObjectId
}
```

---

## 2. Get All Users (Public)

### **GET** `/api/users/public/all`

#### **BEFORE (Old Response)**
```json
{
  "users": [
    {
      "fullName": "John Doe",
      "serviceCategory": "Electrician"  // ❌ Just string
    }
  ]
}
```

#### **NOW (New Response)**
```json
{
  "users": [
    {
      "fullName": "John Doe",
      "serviceCategory": {  // ✅ Populated object
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Electrician",
        "description": "Electrical repair services"
      }
    }
  ]
}
```

---

## 3. Get Tatkal Users

### **GET** `/api/users/tatkal`

#### **BEFORE (Old Query)**
```
GET /api/users/tatkal?serviceCategory=Electrician&pincode=110001
```

#### **NOW (New Query)**
```
GET /api/users/tatkal?serviceCategoryId=64f1a2b3c4d5e6f7g8h9i0j1&pincode=110001
```

#### **Response Change**
```json
{
  "users": [
    {
      "fullName": "John Doe",
      "serviceCategory": {  // ✅ Now populated
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Electrician",
        "description": "Electrical repair services"
      }
    }
  ]
}
```

---

## 4. Get Tatkal Users by Pincode

### **GET** `/api/users/tatkal/by-pincode`

#### **BEFORE (Old Query)**
```
GET /api/users/tatkal/by-pincode?pincode=110001&serviceCategory=Electrician
```

#### **NOW (New Query)**
```
GET /api/users/tatkal/by-pincode?pincode=110001&serviceCategoryId=64f1a2b3c4d5e6f7g8h9i0j1
```

---

## 5. Get Society Service Users by Location

### **GET** `/api/users/public/society-service/by-location`

#### **BEFORE (Old Query)**
```
GET /api/users/public/society-service/by-location?pincode=110001&serviceCategory=Electrician
```

#### **NOW (New Query)**
```
GET /api/users/public/society-service/by-location?pincode=110001&serviceCategoryId=64f1a2b3c4d5e6f7g8h9i0j1
```

#### **Response Change**
```json
{
  "count": 5,
  "users": [
    {
      "fullName": "John Doe",
      "serviceCategory": {  // ✅ Now populated
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Electrician",
        "description": "Electrical repair services"
      }
    }
  ],
  "filters": {
    "pincode": 110001,
    "serviceCategoryId": "64f1a2b3c4d5e6f7g8h9i0j1"  // ✅ Shows ID used
  }
}
```

---

## 6. Get Colony Specific Needs

### **GET** `/api/needs/user/:userId/colony-specific`

#### **BEFORE (Old Query)**
```
GET /api/needs/user/64f1a2b3c4d5e6f7g8h9i0j1/colony-specific?serviceCategory=Electrician
```

#### **NOW (New Query)**
```
GET /api/needs/user/64f1a2b3c4d5e6f7g8h9i0j1/colony-specific?serviceCategoryId=64f1a2b3c4d5e6f7g8h9i0j1
```

---

## Migration Guide

### **Step 1: Get Service Category IDs**
```
GET /api/service-category
```
Response will give you all categories with their IDs.

### **Step 2: Update Frontend Code**
Replace all `serviceCategory` string parameters with `serviceCategoryId` ObjectId parameters.

### **Step 3: Update Registration Forms**
Use dropdown with category IDs instead of category names.

---

## Benefits of Changes

✅ **Better Performance** - Direct ObjectId matching  
✅ **Data Integrity** - Referential integrity with ServiceCategory model  
✅ **Rich Responses** - Get category name + description in responses  
✅ **Consistent API** - All endpoints use same ID format  
✅ **Future Proof** - Easy to add more category fields later