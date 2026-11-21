# Insulini

Es una aplicación diseñada para ayudar a las personas con diabetes a llevar un mejor control de su tratamiento y facilitar el seguimiento por parte de sus médicos y cuidadores. La idea principal es que toda la información importante del paciente se encuentre en un solo lugar, evitando que se pierda entre notas, mensajes o recordatorios.

Las features concretas las puedes encontrar en el archivo README.md

## Tecnologias

#### Backend
Esta construido con ASP.NET 10 usando una webapi con controladores.

Carpeta: Insulini.Api/Insulini.Api

**Paquetes**
- Mediatr
- Entity Framework Core
- Entity Framework Core Design
- Swashbuckle ASP (documentacion swagger)
- Fluent Validation
- BCrypt Net Next
- Microsoft aspnetcore authentication jwtbearer
- Newtonsoft json
- Npgsql entity framework core
- ErrorOr

#### Tests
Se encarga de los tests unitarios y de integracion del backend. Se divide asi:
- Unitarios: unicamente modelos de dominio
- Integracion: flujo completo de un caso de uso con ayuda de devcontainers.

Carpetas:
Insulini.Api/Insulini.UnitTests
Insulini.Api/Insulini.IntegrationTests

**Paquetes**
- Fluent Assertions
- Bogus
- Dev containers (integration only)
- Test containers Postgresql (integration only)
- Microsoft aspnetcore mvc testing (integration only)

#### Frontend
App PWA hecha con react con typescript y vite.

Carpeta: Insulini.App

**Paquetes**
- Zod
- React Form Hook
- React hook form resolvers
- Tanstack query react
- datefns
- sonner
- tailwindcss
- react router
- shadcn

## Diseño
Lo puedes encontrar como imagenes con el nombre de la respectiva pantalla en la carpeta docs/design/*

## Arquitectura del codigo

#### Backend

**Modelos**
Carpeta Models/*

**Features**
Dependiendo del coxtext boundary se nombra la carpeta principal y dentro:
- Commands/*
- Queries/*
- Common/* (dtos como tipo record)

**Data**
En la carpeta Data/ va el dbcontext, las migraciones y las configuraciones de los modelos.


#### Frontend

Usa vertical slice architecture