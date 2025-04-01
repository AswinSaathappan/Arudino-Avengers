def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    return a / b if b != 0 else "Error! Division by zero."

def modulus(a, b):
    return a % b

def power(a, b):
    return a ** b

def sqrt(a, _):
    import math
    return math.sqrt(a)

operations = {
    1: ("Addition", add),
    2: ("Subtraction", subtract),
    3: ("Multiplication", multiply),
    4: ("Division", divide),
    5: ("Modulus", modulus),
    6: ("Exponentiation", power),
    7: ("Square Root (only for first number)", sqrt)
}

while True:
    print("\nChoose an operation:")
    for key, value in operations.items():
        print(f"{key}. {value[0]}")
    print("8. Exit")
    
    choice = int(input("Enter your choice (1-8): "))
    
    if choice == 8:
        print("Exiting... Thank you!")
        break
    
    if choice in operations:
        num1 = float(input("Enter first number: "))
        if choice != 7: 
            num2 = float(input("Enter second number: "))
        else:
            num2 = 0 

        result = operations[choice][1](num1, num2)
        print(f"Result: {result}")
    else:
        print("Invalid choice! Please try again.")
