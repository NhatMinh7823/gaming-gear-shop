class WorkflowUpdater {
  static updateWorkflowBasedOnResult(sessionId, result, toolsUsed, workflowStateManager) {
    const workflow = workflowStateManager.getWorkflowState(sessionId);
    if (!workflow) return;

    const output = result.output?.toLowerCase() || "";
    const intermediateSteps = [];

    let shouldAdvance = false;
    let stepData = {
      toolsUsed,
      timestamp: Date.now(),
      output: result.output,
    };

    switch (workflow.type) {
      case "purchase":
        if (workflow.currentStep === 0 && toolsUsed.includes("product_search")) {
          shouldAdvance = true;
          stepData.searchCompleted = true;
        } else if (workflow.currentStep === 2 && toolsUsed.includes("cart_tool")) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (workflow.currentStep === 4 && toolsUsed.includes("optimized_ai_order_tool")) {
          const orderSuccessMessage = "✅ **ĐẶT HÀNG THÀNH CÔNG!";
          const orderErrorMessage = "❌ **LỖI TẠO ĐƠN HÀNG**";
          if (result.output.includes(orderSuccessMessage)) {
            shouldAdvance = true;
            stepData.orderInitiated = true;
            stepData.orderSuccess = true;
          } else if (result.output.includes(orderErrorMessage)) {
            workflowStateManager.errorWorkflow(sessionId, result.output);
            return;
          } else {
            shouldAdvance = true;
            stepData.orderInitiated = true;
          }
        }
        break;

      case "search":
        if (workflow.currentStep === 0 && toolsUsed.includes("product_search")) {
          shouldAdvance = true;
          stepData.searchCompleted = true;
        } else if (workflow.currentStep === 1) {
          shouldAdvance = true;
          stepData.resultsDisplayed = true;
        }
        break;

      case "wishlist_purchase":
        if (workflow.currentStep === 0 && toolsUsed.includes("wishlist_tool")) {
          shouldAdvance = true;
          stepData.wishlistRetrieved = true;
        } else if (workflow.currentStep === 2 && toolsUsed.includes("cart_tool")) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (workflow.currentStep === 3 && toolsUsed.includes("optimized_ai_order_tool")) {
          shouldAdvance = true;
          stepData.orderInitiated = true;
        }
        break;

      case "category_browse":
        if (workflow.currentStep === 0 && toolsUsed.includes("category_list_tool")) {
          shouldAdvance = true;
          stepData.categoriesListed = true;
        } else if (workflow.currentStep === 1 && toolsUsed.includes("ai_product_search")) {
          shouldAdvance = true;
          stepData.productsSearched = true;
        } else if (workflow.currentStep === 2 && toolsUsed.includes("cart_tool")) {
          shouldAdvance = true;
          stepData.addedToCart = true;
        } else if (workflow.currentStep === 3 && toolsUsed.includes("optimized_ai_order_tool")) {
          shouldAdvance = true;
          stepData.orderInitiated = true;
        }
        break;
    }

    if (shouldAdvance) {
      workflowStateManager.advanceWorkflow(sessionId, stepData);
    }

    if (stepData.orderSuccess) {
      workflowStateManager.completeWorkflow(sessionId, {
        finalOutput: result.output,
        toolsUsed: toolsUsed,
        totalSteps: workflow.currentStep,
      });
    } else if (!workflowStateManager.shouldContinueWorkflow(sessionId)) {
      workflowStateManager.completeWorkflow(sessionId, {
        finalOutput: result.output,
        toolsUsed: toolsUsed,
        totalSteps: workflow.currentStep,
      });
    }

    if (output.includes("không") && (output.includes("mua") || output.includes("đặt hàng"))) {
      workflowStateManager.cancelWorkflow(sessionId, "user_declined");
    }
  }

  static isWorkflowComplete(intermediateSteps) {
    return false;

    const purchaseWorkflow = ["product_search", "cart_tool", "optimized_ai_order_tool"];
    const searchAndCartWorkflow = ["product_search", "cart_tool"];
    const wishlistPurchaseWorkflow = ["wishlist_tool", "cart_tool", "optimized_ai_order_tool"];
    const categoryBrowseWorkflow = ["category_list_tool", "cart_tool"];

    const hasPurchaseWorkflow = purchaseWorkflow.every((tool) => toolsUsed.includes(tool));
    const hasSearchAndCart = searchAndCartWorkflow.every((tool) => toolsUsed.includes(tool));
    const hasWishlistPurchase = wishlistPurchaseWorkflow.every((tool) => toolsUsed.includes(tool));
    const hasCategoryBrowse = categoryBrowseWorkflow.every((tool) => toolsUsed.includes(tool));

    return (
      hasPurchaseWorkflow ||
      hasWishlistPurchase ||
      hasSearchAndCart ||
      hasCategoryBrowse
    );
  }
}

module.exports = WorkflowUpdater;
