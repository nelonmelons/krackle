from django.http import JsonResponse

def test_view(request):
    try:
        arg1 = int(request.GET.get("arg1", 0))
        arg2 = int(request.GET.get("arg2", 0))
        result = arg1 + arg2
        return JsonResponse({"message": f"The result of {arg1} + {arg2} is {result}"})
    except ValueError:
        return JsonResponse({"error": "Invalid input, please provide integers for arg1 and arg2"}, status=400)
