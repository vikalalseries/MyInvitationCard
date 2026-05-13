// CATEGORY BUTTONS

const filterButtons = document.querySelectorAll(".filters button");

// LOOP THROUGH BUTTONS

filterButtons.forEach((button) => {

  button.addEventListener("click", () => {

    // REMOVE ACTIVE CLASS FROM ALL

    filterButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    // ADD ACTIVE CLASS TO CLICKED BUTTON

    button.classList.add("active");

  });

});